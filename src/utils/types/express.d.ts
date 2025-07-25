import 'express';

declare module 'express' {
  export interface Request {
    fullurl: string;
    user: { user_id: string };
    admin: { admin_id: string; role: 'admin' | 'superadmin'; fullname: string };
    is_login: boolean;
  }
}
