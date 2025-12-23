// amazonq-ignore-file typescript-code-quality-error-handling
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    // amazonq-ignore-next-line
    // amazonq-ignore-next-line
    console.log('Company login attempt for email:', email);
    
    const company = await prisma.company.findUnique({ where: { email } });
    console.log('Company found:', company ? 'yes' : 'no');

    if (!company) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const valid = await bcrypt.compare(password, company.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Generate token with company ID and type to distinguish from users
    const token = await generateToken({ 
      id: company.id, 
      type: "company",
      email: company.email,
      name: company.name
    });

    return NextResponse.json({ 
      message: "Logged in successfully",
      token, 
      company: { 
        id: company.id, 
        email: company.email,
        name: company.name,
        type: "company"
      } 
    });
  } catch (err) {
    console.error('Company login error:', err);
    // amazonq-ignore-next-line typescript-code-quality-error-handling
    return NextResponse.json({ 
      error: "Login failed", 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
