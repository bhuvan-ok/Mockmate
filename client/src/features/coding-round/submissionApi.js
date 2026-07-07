import { axiosInstance } from '../../api/axios.js';

export const createSubmission = async ({ attemptId, language, code, mode, customInput }) => {
  const { data } = await axiosInstance.post('/submissions', {
    attemptId,
    language,
    code,
    mode,
    customInput,
  });
  return data.data;
};

export const getSubmission = async (submissionId) => {
  const { data } = await axiosInstance.get(`/submissions/${submissionId}`);
  return data.data;
};
