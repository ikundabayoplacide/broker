'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

interface ProfileReminderCardProps {
  userData: any;
  className?: string;
}

export default function ProfileReminderCard({ userData, className = '' }: ProfileReminderCardProps) {
  const profileReminder = useMemo(() => {
    if (!userData) {
      return { needed: false, tasks: [] as string[] };
    }

    const isEmpty = (value: unknown) =>
      value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0);

    const requirements = [
      {
        id: 'verify-email',
        message: 'verify your email',
        optional: false,
        isComplete: () => userData.isVerified === true,
      },
      {
        id: 'phone',
        message: 'add a phone number',
        optional: false,
        isComplete: () => !isEmpty(userData.phone) && !isEmpty(userData.phoneCountryCode),
      },
      {
        id: 'address',
        message: 'confirm your address',
        optional: false,
        isComplete: () => !isEmpty(userData.country) && !isEmpty(userData.city),
      },
      {
        id: 'id-document',
        message: 'upload your ID document',
        optional: false,
        isComplete: () => !isEmpty(userData.idDocument),
      },
      {
        id: 'passport-photo',
        message: 'add a passport photo',
        optional: false,
        isComplete: () => !isEmpty(userData.passportPhoto),
      },
    ];

    const missingEssentials = requirements.filter((item) => !item.optional && !item.isComplete());
    const tasks = missingEssentials.map((item) => item.message);

    return {
      needed: missingEssentials.length > 0,
      tasks,
    };
  }, [userData]);

  const formatTaskList = (tasks: string[]) => {
    if (tasks.length <= 1) return tasks[0] ?? '';
    const leading = tasks.slice(0, -1).join(', ');
    const last = tasks[tasks.length - 1];
    return `${leading} and ${last}`;
  };

  if (!profileReminder.needed) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-3 md:gap-4 rounded-xl md:rounded-2xl border border-amber-200 bg-amber-50 p-3 md:p-5 text-sm text-amber-900 md:flex-row md:items-center md:justify-between ${className}`}>
      <div className="flex items-start gap-2 md:gap-3 min-w-0">
        <AlertCircle className="mt-0.5 h-4 w-4 md:h-5 md:w-5 shrink-0 text-amber-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-xs md:text-sm">Complete your profile</p>
          <p className="text-amber-800 text-xs md:text-sm">
            Finish setting up your account: {formatTaskList(profileReminder.tasks)}.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/commonPage/settings"
        className="inline-flex items-center justify-center rounded-full border border-[#004F64] px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-[#004F64] transition hover:bg-[#004F64] hover:text-white whitespace-nowrap shrink-0"
      >
        Update profile
      </Link>
    </div>
  );
}