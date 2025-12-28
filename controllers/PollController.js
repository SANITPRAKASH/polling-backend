import PollService from '../services/PollService.js';

class PollController {
  async createPoll(req, res) {
    console.log('[PollController] createPoll called');

    try {
      const { question, options, timeLimit } = req.body;

      if (!question || !options || options.length < 2) {
        console.log('[PollController] Validation failed');
        return res.status(400).json({
          success: false,
          message: 'Question and at least 2 options are required',
        });
      }

      const result = await PollService.createPoll(
        question,
        options,
        timeLimit || 60
      );

      if (result.success) {
        console.log('[PollController] Poll created');
        res.status(201).json(result);
      } else {
        console.log('[PollController] Poll creation failed');
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[PollController] Error creating poll:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getActivePoll(req, res) {
    console.log('[PollController] getActivePoll called');

    try {
      const result = await PollService.getActivePoll();

      if (result.success && result.poll) {
        const remainingTime = PollService.getRemainingTime(result.poll);

        res.json({
          ...result,
          remainingTime,
        });
      } else {
        res.json(result);
      }
    } catch (error) {
      console.error('[PollController] Error getting active poll:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPollHistory(req, res) {
    console.log('[PollController] getPollHistory called');

    try {
      const result = await PollService.getPollHistory();
      res.json(result);
    } catch (error) {
      console.error('[PollController] Error getting poll history:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new PollController();
