import mongoose from 'mongoose';


const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  votes: {
    type: Number,
    default: 0,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
});


const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: [optionSchema],
    timeLimit: {
      type: Number,
      default: 60,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Poll = mongoose.model('Poll', pollSchema);

console.log('[POLL] Poll model initialized');

export default Poll;
