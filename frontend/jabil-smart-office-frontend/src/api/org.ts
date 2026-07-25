import request from '@/utils/request';

// 获取所有部门
export function getDepartments() {
  return request.get('/departments').then((res: any) => {
    // 拦截器已自动解包 data，直接使用 res
    const data = res || {};
    return data.departments || [];
  });
}

// 获取所有厂区
export function getPlants() {
  return request.get('/plants').then((res: any) => {
    // 拦截器已自动解包 data，直接使用 res
    const data = res || {};
    return data.plants || [];
  });
}

// 获取所有岗位
export function getPositions() {
  return request.get('/positions').then((res: any) => {
    // 拦截器已自动解包 data，直接使用 res
    const data = res || {};
    return data.items || [];
  });
}
