/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <>
      <footer className="bg-[#004B5B] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Link href="/">
                  <Image
                    src="/logo.png"
                    alt="logo"
                    width={130}
                    height={40}
                    className="w-24 bg-white rounded-md p-2"
                    priority
                  />
                </Link>
              </div>
              <p className="text-sm text-gray-400">
                Rwanda's leading digital broker platform for secure and
                efficient trading.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Trading
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Investments
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Wallet
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm">
                <Link href="#">
                  Support
                </Link>
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Compliance
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 pt-6 text-center text-sm text-gray-400">
            <p className="text-center py-5  text-sm text-white border-t border-gray-400">
                © {new Date().getFullYear()}{" "}
                <span className="mx-1 font-medium text-white">
                    Stock Broker
                </span>{" "}
                — All Rights Reserved, Developed by{" "}
                <Link
                    href="https://www.santechrwanda.com"
                    target="_blank"
                    className="hover:underline"
                >
                    SAN TECH
                </Link>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
