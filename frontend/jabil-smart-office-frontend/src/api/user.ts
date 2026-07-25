import request from '@/utils/request'; // Assuming you have a request utility

// 获取当前登录用户信息
export function getUserInfo() {
  return request({
    url: '/users/me', // Assuming an endpoint to get current user info
    method: 'get',
  });
}
