import { axiosInstance } from '../../api/axios.js';

// AI is used only for the post-round feedback summary now — in-round hints
// are handwritten per question and ship inline on the question payload (see
// components/common/HintsList.jsx), no server call needed.
export const getFeedback = async (attemptId) => {
  const { data } = await axiosInstance.get(`/ai/${attemptId}/feedback`);
  return data.data;
};
