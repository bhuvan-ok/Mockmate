import { User } from '../auth/user.model.js';
import { Attempt } from '../attempt/attempt.model.js';
import { Question } from '../question/question.model.js';
import { InterviewSet } from '../interview-set/interview-set.model.js';

export const getAnalytics = async () => {
  const [candidateCount, questionCount, interviewSetCount, attemptStats] = await Promise.all([
    User.countDocuments({ role: 'candidate', isActive: true }),
    Question.countDocuments({ isActive: true }),
    InterviewSet.countDocuments({ isActive: true }),
    Attempt.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          avgScore: { $avg: '$overallScore' },
          avgTabSwitches: { $avg: '$integrityFlags.tabSwitchCount' },
        },
      },
    ]),
  ]);

  const stats = attemptStats[0] || {
    totalAttempts: 0,
    completedAttempts: 0,
    avgScore: 0,
    avgTabSwitches: 0,
  };

  return {
    candidateCount,
    questionCount,
    interviewSetCount,
    totalAttempts: stats.totalAttempts,
    completedAttempts: stats.completedAttempts,
    completionRate: stats.totalAttempts
      ? Math.round((stats.completedAttempts / stats.totalAttempts) * 100)
      : 0,
    avgScore: Math.round(stats.avgScore || 0),
    avgTabSwitches: Math.round((stats.avgTabSwitches || 0) * 10) / 10,
  };
};
