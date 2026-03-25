// import axios from 'axios';

// const api = axios.create({ baseURL: '/api' });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('vms_token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     // Only auto-redirect on 401 for staff/admin/guard routes, NOT for pass routes
//     const url = err.config?.url || '';
//     const isPassRoute = url.includes('/passes/');
//     if (err.response?.status === 401 && !isPassRoute) {
//       localStorage.removeItem('vms_token');
//       localStorage.removeItem('vms_user');
//       window.location.href = '/';
//     }
//     return Promise.reject(err);
//   }
// );

// export default api;




import axios from 'axios';

// ✅ Use your live backend URL here
const api = axios.create({
  baseURL: 'https://vms-3-xn2b.onrender.com/api'
});

// 🔹 Request interceptor: add token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// 🔹 Response interceptor: handle 401 (auto-logout) only for non-pass routes
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isPassRoute = url.includes('/passes/');
    
    if (err.response?.status === 401 && !isPassRoute) {
      localStorage.removeItem('vms_token');
      localStorage.removeItem('vms_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;