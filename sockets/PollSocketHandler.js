import PollService from "../services/PollService.js";

class PollSocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.students = new Map();
    this.chatMessages = [];

    console.log(" PollSocketHandler initialized");
  }

  handleConnection(socket) {
    console.log("🔌 New client connected:", socket.id);

    // Student joins
    socket.on("student:join", async (studentName) => {
      console.log(" Student join request:", studentName, socket.id);
      try {
        const studentInfo = {
          socketId: socket.id,
          name: studentName,
          type: "student",
          joinedAt: new Date(),
        };

        this.connectedUsers.set(socket.id, studentInfo);
        this.students.set(socket.id, studentInfo);

        console.log(" Student stored:", studentInfo);
        console.log(" Total students now:", this.students.size);

        socket.emit("student:joined", { success: true, name: studentName });

        const result = await PollService.getActivePoll();
        if (result.success && result.poll && result.poll.isActive) {
          const remainingTime = PollService.getRemainingTime(result.poll);
          
          
          if (remainingTime > 0) {
            console.log(` Sending active poll to student with ${remainingTime}s remaining`);
            socket.emit("poll:active", {
              poll: result.poll,
              remainingTime,
            });
          } else {
            console.log(" Poll time expired, not sending to student");
          }
        } else {
          console.log(" No active poll to send to student");
        }

        
        this.broadcastUserCount();
        this.broadcastStudentList();
      } catch (error) {
        console.error(" student:join error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Teacher joins
    socket.on("teacher:join", () => {
      console.log("Teacher joined:", socket.id);
      this.connectedUsers.set(socket.id, {
        type: "teacher",
        socketId: socket.id,
      });
      socket.emit("teacher:joined", { success: true });

      
      this.broadcastUserCount();
      this.sendStudentListToSocket(socket);
    });

    
    socket.on("request:student:list", () => {
      console.log(" Explicit student list request from:", socket.id);
      this.sendStudentListToSocket(socket);
    });

    // Chat send message
    socket.on("chat:send", (data) => {
      const { message, senderName, senderType } = data;

      const chatMessage = {
        id: Date.now().toString() + Math.random(),
        message,
        senderName,
        senderType,
        timestamp: new Date(),
      };

      this.chatMessages.push(chatMessage);

      // Show only last 100 messages
      if (this.chatMessages.length > 100) {
        this.chatMessages.shift();
      }

      console.log(" Chat message:", chatMessage);

      
      this.io.emit("chat:message", chatMessage);
    });

    // Chat history
    socket.on("chat:history", () => {
      console.log(" Chat history requested by:", socket.id);
      socket.emit("chat:history", { messages: this.chatMessages });
    });

    // Teacher kicking Student
    socket.on("student:kick", (data) => {
      console.log(" Kick request:", data);
      const { socketId } = data;

      const student = this.students.get(socketId);
      if (student) {
        
        this.io.to(socketId).emit("student:kicked", {
          message: "You have been removed by the teacher",
        });

        console.log(`🦵 Kicking student: ${student.name}`);

        
        setTimeout(() => {
          const studentSocket = this.io.sockets.sockets.get(socketId);
          if (studentSocket) {
            studentSocket.disconnect(true);
          }

          this.connectedUsers.delete(socketId);
          this.students.delete(socketId);

          this.broadcastUserCount();
          this.broadcastStudentList();
        }, 100);
      } else {
        console.log(" Student not found for kick:", socketId);
      }
    });

    // Poll creation
    socket.on("poll:create", async (data) => {
      console.log(" Poll create request:", data);
      try {
        const { question, options, timeLimit } = data;

       
        const existingPoll = await PollService.getActivePoll();
        if (existingPoll.success && existingPoll.poll) {
          console.log(" Ending previous active poll");
          await PollService.endPoll(existingPoll.poll._id);
        }

        const createResult = await PollService.createPoll(
          question,
          options,
          timeLimit
        );
        console.log(" Poll create result:", createResult);

        if (!createResult.success) {
          socket.emit("error", { message: createResult.error });
          return;
        }

        const startResult = await PollService.startPoll(createResult.poll._id);
        console.log(" Poll start result:", startResult);

        if (!startResult.success) {
          socket.emit("error", { message: startResult.error });
          return;
        }

        this.io.emit("poll:started", {
          poll: startResult.poll,
          remainingTime: timeLimit,
        });

        setTimeout(async () => {
          console.log(" Poll time ended");
          await PollService.endPoll(startResult.poll._id);
          const updatedPoll = await PollService.getActivePoll();
          this.io.emit("poll:ended", { poll: updatedPoll.poll });
        }, timeLimit * 1000);
      } catch (error) {
        console.error(" poll:create error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Vote submittion
    socket.on("vote:submit", async (data) => {
      console.log(" Vote submit:", data);
      try {
        const { pollId, studentName, optionId } = data;
        const result = await PollService.submitVote(
          pollId,
          studentName,
          optionId
        );

        console.log(" Vote result:", result);

        if (result.success) {
          socket.emit("vote:success", { poll: result.poll });
          this.io.emit("poll:update", { poll: result.poll });
        } else {
          socket.emit("vote:error", { message: result.error });
        }
      } catch (error) {
        console.error(" vote:submit error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Poll history
    socket.on("poll:history", async () => {
      console.log(" Poll history requested");
      try {
        const result = await PollService.getPollHistory();
        socket.emit("poll:history:data", result);
      } catch (error) {
        console.error(" poll:history error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(" Client disconnected:", socket.id);
      this.connectedUsers.delete(socket.id);
      this.students.delete(socket.id);
      this.broadcastUserCount();
      this.broadcastStudentList();
    });
  }

 
  sendStudentListToSocket(socket) {
    const studentList = Array.from(this.students.values()).map((student) => ({
      socketId: student.socketId,
      name: student.name,
      joinedAt: student.joinedAt,
    }));

    console.log(" Sending student list to socket:", socket.id, studentList);
    socket.emit("students:list", { students: studentList });
  }

 
  broadcastUserCount() {
    const students = Array.from(this.students.values());
    console.log(" Broadcasting user count - Students:", students.length);

    this.io.emit("users:count", {
      total: this.connectedUsers.size,
      students: students.length,
    });
  }

  broadcastStudentList() {
    const studentList = Array.from(this.students.values()).map((student) => ({
      socketId: student.socketId,
      name: student.name,
      joinedAt: student.joinedAt,
    }));

    console.log(" Broadcasting student list to ALL:", studentList);

    this.io.emit("students:list", { students: studentList });
  }
}

export default PollSocketHandler;