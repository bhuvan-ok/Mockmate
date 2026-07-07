import { axiosInstance } from '../../api/axios.js';

export const getAnalytics = async () => {
  const { data } = await axiosInstance.get('/admin/analytics');
  return data.data;
};

export const listQuestions = async (params = {}) => {
  const { data } = await axiosInstance.get('/questions', { params });
  return data.data;
};

export const createQuestion = async (payload) => {
  const { data } = await axiosInstance.post('/questions', payload);
  return data.data;
};

export const deleteQuestion = async (id) => {
  await axiosInstance.delete(`/questions/${id}`);
};

export const listInterviewSetsAdmin = async () => {
  const { data } = await axiosInstance.get('/interview-sets/admin/all');
  return data.data;
};

export const createInterviewSet = async (payload) => {
  const { data } = await axiosInstance.post('/interview-sets/admin', payload);
  return data.data;
};

export const deleteInterviewSet = async (id) => {
  await axiosInstance.delete(`/interview-sets/admin/${id}`);
};

export const listAttemptsAdmin = async (params = {}) => {
  const { data } = await axiosInstance.get('/attempts/admin', { params });
  return data.data;
};
