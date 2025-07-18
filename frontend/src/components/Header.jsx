import React from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";

function Header() {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6 mb-6 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Matching App</h1>
          <p className="text-slate-600 text-sm">Sistem pencocokan data duplikat</p>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <SignedOut>
          <SignInButton />
          <SignUpButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  );
}

export default Header;