// amazonq-ignore-file typescript-code-quality-error-handling
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log('Login attempt for email:', email);
    
    // Try to find user first
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('User found:', user ? 'yes' : 'no');

    if (user) {
      // User login flow
      if (!user.isVerified) {
        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
          return NextResponse.json({ error: "OTP expired. Please request a new OTP." }, { status: 400 });
        }
        return NextResponse.json({ error: "Email not verified" }, { status: 400 });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });

      const token = await generateToken({ id: user.id, role: user.role, email: user.email, name: user.fullName, passportPhoto: user.passportPhoto });
      
      const responseData = { 
        message: "Logged in successfully",
        token, 
        user: { id: user.id, role: user.role, email: user.email, name: user.fullName, passportPhoto: user.passportPhoto } 
      };
      
      console.log('Sending user login response:', responseData);
      return NextResponse.json(responseData);
    }

    // If no user found, try company
    console.log('No user found, checking for company...');
    const company = await prisma.company.findUnique({ where: { email } });
    console.log('Company found:', company ? 'yes' : 'no');

    if (company) {
      // Company login flow
      const valid = await bcrypt.compare(password, company.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });

      const token = await generateToken({ 
        id: company.id, 
        type: "company",
        email: company.email,
        name: company.name
      });

      const responseData = { 
        message: "Logged in successfully",
        token, 
        company: { 
          id: company.id, 
          email: company.email,
          name: company.name,
          role: "COMPANY", // Add role for consistency with user login
          type: "company"
        } 
      };
      
      console.log('Sending company login response:', responseData);
      return NextResponse.json(responseData);
    }

    // Neither user nor company found
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ 
      error: "Login failed", 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
