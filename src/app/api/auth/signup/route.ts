import { prisma } from "@/lib/prisma";
import { sendOTPEmail } from "@/utils/mailer";
import { signupSchema, SignupPayload } from "@/lib/validations/signupValidation";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const defaultNotificationPreferences = {
  email: true,
  sms: false,
  push: false,
};

export async function POST(req: Request) {
  try {
  const data = await req.json();
  const parsed = signupSchema.safeParse(data);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          error: issues[0]?.message ?? "Invalid signup data",
          errors: issues,
        },
        { status: 400 }
      );
    }

    const validated: SignupPayload = parsed.data;
    const {
      fullName,
      email,
      phoneCountryCode,
      phone,
      password,
      confirmPassword,
      gender,
      country,
      city,
    } = validated;
    void confirmPassword;

    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({ where: { email } });
    } catch (dbErr) {
      console.error("Database error checking existing user:", dbErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    let hashed;
    try {
      hashed = await bcrypt.hash(password, 10);
    } catch (hashErr) {
      console.error("Password hashing error:", hashErr);
      return NextResponse.json({ error: "Password hashing failed" }, { status: 500 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    let createdUser: { id: string } | null = null;
    try {
      const createData = {
        id: uuidv4(),
        fullName,
        email,
        phoneCountryCode,
        phone,
        password: hashed,
        gender,
        country,
        city,
        role: "CLIENT" as const,
        otp,
        otpExpiresAt,
        notificationPreferences: defaultNotificationPreferences,
        updatedAt: new Date(),
      };

      createdUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: createData,
          select: { id: true },
        });

        // Create wallet for the new user
        await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
          },
        });

        return user;
      });
    } catch (createErr) {
      console.error("Database error creating user:", createErr);
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }

    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.error("Error sending OTP email:", emailErr);
      return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
    }

    return NextResponse.json({
      message: "OTP sent to email for verification",
      userId: createdUser?.id,
    });
  } catch (err) {
    console.error("Unexpected error in signup route:", err);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
