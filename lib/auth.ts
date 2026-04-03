import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "./mongodb";
import { User } from "./models/User";
import { generateUniqueNickname } from "./utils/nickname";

const ALLOWED_DOMAIN = "itbhu.ac.in";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error", // Error code passed in query string as ?error=
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email;

        // if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        //   // Returning false or a completely custom URL redirects to error page
        //   return `/auth/error?error=AccessDenied`;
        // }

        if (!email) {
          // Returning false or a completely custom URL redirects to error page
          return `/auth/error?error=AccessDenied`;
        }

        try {
          // Connect to MongoDB
          await connectToDatabase();
          
          // Check if user exists, else create one
          let existingUser = await User.findOne({ email });
          
          if (!existingUser) {
            existingUser = await User.create({
              email,
              anonId: await generateUniqueNickname(),
              avatar: user.image || "",
            });
          }
          
          return true;
        } catch (error) {
          console.error("Error saving user to DB:", error);
          return false;
        }
      }
      return false;
    },
    async session({ session, token }) {
      // Do not expose personal data like email/name to frontend if not needed,
      // butNextAuth by default includes name, email, image.
      // E.g., strip name/image for strict privacy
      
      // Let's just attach internal custom user ID if needed, 
      // but we shouldn't expose sensitive DB properties directly.
      return session;
    },
    async jwt({ token, user, account, profile }) {
      return token;
    }
  },
  session: {
    strategy: "jwt",
  },
};