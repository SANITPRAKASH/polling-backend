import Poll from "../models/Poll.js";
import Vote from "../models/Vote.js";

class PollService {
  async createPoll(question, options, timeLimit) {
    console.log("[PollService] Creating poll");

    try {
      const poll = new Poll({
        question,
        options: options.map((opt) => ({
          text: opt.text,
          votes: 0,
          isCorrect: opt.isCorrect || false,
        })),
        timeLimit,
        isActive: false,
      });

      await poll.save();
      console.log("[PollService] Poll created successfully");

      return { success: true, poll };
    } catch (error) {
      console.error("[PollService] Error creating poll:", error.message);
      return { success: false, error: error.message };
    }
  }

  async startPoll(pollId) {
    console.log("[PollService] Starting poll:", pollId);

    try {
      const poll = await Poll.findById(pollId);
      if (!poll) {
        return { success: false, error: "Poll not found" };
      }

      poll.isActive = true;
      poll.startTime = new Date();
      poll.endTime = new Date(Date.now() + poll.timeLimit * 1000);
      await poll.save();

      console.log("[PollService] Poll started");
      return { success: true, poll };
    } catch (error) {
      console.error("[PollService] Error starting poll:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getActivePoll() {
    console.log("[PollService] Fetching active poll");

    try {
      const poll = await Poll.findOne({ isActive: true }).sort({
        startTime: -1,
      });
      return { success: true, poll };
    } catch (error) {
      console.error("[PollService] Error getting active poll:", error.message);
      return { success: false, error: error.message };
    }
  }

  async submitVote(pollId, studentName, optionId) {
    console.log("[PollService] Submitting vote");

    try {
      const existingVote = await Vote.findOne({ pollId, studentName });
      if (existingVote) {
        return { success: false, error: "You have already voted" };
      }

      const poll = await Poll.findById(pollId);
      if (!poll || !poll.isActive) {
        return { success: false, error: "Poll is not active" };
      }

      if (new Date() > poll.endTime) {
        return { success: false, error: "Time is up" };
      }

      const vote = new Vote({
        pollId,
        studentName,
        optionId,
      });
      await vote.save();

      const optionIndex = poll.options.findIndex(
        (opt) => opt._id.toString() === optionId
      );

      if (optionIndex !== -1) {
        poll.options[optionIndex].votes += 1;
        poll.totalVotes += 1;
        await poll.save();
      }

      console.log("[PollService] Vote submitted successfully");
      return { success: true, poll };
    } catch (error) {
      console.error("[PollService] Error submitting vote:", error.message);
      return { success: false, error: error.message };
    }
  }

  async endPoll(pollId) {
    console.log("[PollService] Ending poll:", pollId);

    try {
      const poll = await Poll.findById(pollId);
      if (!poll) {
        return { success: false, error: "Poll not found" };
      }

      poll.isActive = false;
      poll.endTime = new Date();
      await poll.save();

      console.log("[PollService] Poll ended");
      return { success: true, poll };
    } catch (error) {
      console.error("[PollService] Error ending poll:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getPollHistory() {
    console.log("[PollService] Fetching poll history");

    try {
      const polls = await Poll.find({ isActive: false }).sort({
        createdAt: -1,
      });
      return { success: true, polls };
    } catch (error) {
      console.error("[PollService] Error getting poll history:", error.message);
      return { success: false, error: error.message };
    }
  }

  getRemainingTime(poll) {
    if (!poll || !poll.startTime) return 0;

    const elapsed = Math.floor(
      (Date.now() - new Date(poll.startTime).getTime()) / 1000
    );

    return Math.max(0, poll.timeLimit - elapsed);
  }
}

export default new PollService();
