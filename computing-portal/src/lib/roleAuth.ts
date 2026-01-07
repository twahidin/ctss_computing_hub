import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { UserProfile, PROFILE_HIERARCHY } from '@/types';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    username: string;
    name: string;
    profile: UserProfile;
    school?: string;
    schoolId?: string;
    class?: string;
    level?: string;
    approvalStatus: string;
  };
}

type ApiHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>;

// Middleware to require authentication
export function withAuth(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    (req as AuthenticatedRequest).user = session.user as any;
    return handler(req as AuthenticatedRequest, res);
  };
}

// Middleware to require specific profiles
export function withProfile(...allowedProfiles: UserProfile[]) {
  return (handler: ApiHandler) => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!allowedProfiles.includes(req.user.profile)) {
        return res.status(403).json({ 
          message: `Access denied. Required profiles: ${allowedProfiles.join(', ')}` 
        });
      }
      return handler(req, res);
    });
  };
}

// Middleware to require minimum profile level
export function withMinProfile(minProfile: UserProfile) {
  return (handler: ApiHandler) => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      const userLevel = PROFILE_HIERARCHY[req.user.profile];
      const requiredLevel = PROFILE_HIERARCHY[minProfile];
      
      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          message: `Access denied. Minimum required profile: ${minProfile}` 
        });
      }
      return handler(req, res);
    });
  };
}

// Check if user can manage a specific school
export function canManageSchool(userProfile: UserProfile, userSchoolId?: string, targetSchoolId?: string): boolean {
  // Super admin can manage all schools
  if (userProfile === 'super_admin') return true;
  
  // Admin can only manage their own school
  if (userProfile === 'admin') {
    return userSchoolId === targetSchoolId;
  }
  
  return false;
}

// Check if user can manage users in a specific class
export function canManageClass(
  userProfile: UserProfile, 
  userSchoolId?: string, 
  userClass?: string,
  targetSchoolId?: string, 
  targetClass?: string
): boolean {
  // Super admin can manage all
  if (userProfile === 'super_admin') return true;
  
  // Admin can manage their school
  if (userProfile === 'admin') {
    return userSchoolId === targetSchoolId;
  }
  
  // Teacher can only manage their own class
  if (userProfile === 'teacher') {
    return userSchoolId === targetSchoolId && userClass === targetClass;
  }
  
  return false;
}

