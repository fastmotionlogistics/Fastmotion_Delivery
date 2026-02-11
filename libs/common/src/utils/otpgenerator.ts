import { timeZoneMoment } from './others';

export const GenerateOtp = () => {
  const otp = '123456';
  // const otp = Math.floor(100000 + Math.random() * 900000);
  let expiry = new Date(Date.now() + 3 * 60 * 1000);

  return { otp, expiry };
};
