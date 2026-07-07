import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './user.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../../utils/token.js';

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  rating: user.rating,
});

const issueTokens = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  return { accessToken, refreshToken };
};

export const registerCandidate = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword, role: 'candidate' });

  const tokens = await issueTokens(user);
  return { user: sanitize(user), ...tokens };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true }).select(
    '+password'
  );
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const isMatch = await bcrypt.compare(password.trim(), user.password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password');

  const tokens = await issueTokens(user);
  return { user: sanitize(user), ...tokens };
};

export const refreshSession = async (refreshToken) => {
  if (!refreshToken) throw new ApiError(401, 'Refresh token missing');

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.id).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) throw new ApiError(401, 'Session no longer valid');

  if (user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new ApiError(401, 'Refresh token reuse detected — please log in again');
  }

  const tokens = await issueTokens(user);
  return { user: sanitize(user), ...tokens };
};

export const logout = async (refreshToken) => {
  if (!refreshToken) return;
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    return;
  }
  await User.findByIdAndUpdate(payload.id, { refreshTokenHash: null });
};
