import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Please enter username and password');
        }

        await dbConnect();

        const user = await User.findOne({ username: credentials.username }).select(
          '+password'
        );

        if (!user) {
          throw new Error('No user found with this username');
        }

        const isPasswordValid = await user.comparePassword(credentials.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        // Check if user is approved (super_admin is auto-approved)
        if (user.profile !== 'super_admin' && user.approvalStatus !== 'approved') {
          if (user.approvalStatus === 'pending') {
            throw new Error('Your account is pending approval. Please wait for an administrator to approve your registration.');
          }
          if (user.approvalStatus === 'rejected') {
            throw new Error(`Your registration was rejected. ${user.rejectionReason || 'Please contact an administrator.'}`);
          }
        }

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        return {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          email: user.email || undefined,
          profile: user.profile,
          school: user.schoolName || undefined,
          schoolId: user.school?.toString() || undefined,
          class: user.class || undefined,
          level: user.level || undefined,
          approvalStatus: user.approvalStatus,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username as string;
        token.profile = user.profile;
        token.school = user.school;
        token.schoolId = user.schoolId;
        token.class = user.class;
        token.level = user.level;
        token.approvalStatus = user.approvalStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.profile = token.profile as any;
        session.user.school = token.school as string | undefined;
        session.user.schoolId = token.schoolId as string | undefined;
        session.user.class = token.class as string | undefined;
        session.user.level = token.level as string | undefined;
        session.user.approvalStatus = token.approvalStatus as any;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
