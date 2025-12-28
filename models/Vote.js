import mongoose from 'mongoose';


const voteSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  optionId: {
    type: String,
    required: true,
  },
  votedAt: {
    type: Date,
    default: Date.now,
  },
});


voteSchema.index(
  { pollId: 1, studentName: 1 },
  { unique: true }
);


const Vote = mongoose.model('Vote', voteSchema);

console.log('[VOTE] Vote model initialized');

export default Vote;
