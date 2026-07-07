import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { refreshCookieOptions } from '../../utils/token.js';
import * as authService from './auth.service.js';

const sendAuthResponse = (res, statusCode, { user, accessToken, refreshToken }, message) => {
  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .json(new ApiResponse(statusCode, { user, accessToken }, message));
};

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerCandidate(req.body);
  sendAuthResponse(res, 201, result, 'Registered successfully');
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sendAuthResponse(res, 200, result, 'Logged in successfully');
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshSession(req.cookies?.refreshToken);
  sendAuthResponse(res, 200, result, 'Session refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.refreshToken);
  res
    .status(200)
    .clearCookie('refreshToken', { path: '/api/v1/auth' })
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});
