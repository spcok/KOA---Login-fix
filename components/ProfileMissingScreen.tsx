import React from 'react';
import { Loader2 } from 'lucide-react';

const ProfileMissingScreen = ({ userId }: { userId: string }) => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 gap-4 p-4">
    <Loader2 className="animate-spin text-amber-600" size={48} />
    <h1 className="text-2xl font-bold text-slate-800">Profile Not Found</h1>
    <p className="text-slate-600 text-center max-w-md">
      Your user account exists, but we couldn't find a corresponding staff profile. 
      Please contact your administrator to have one created.
    </p>
    <div className="mt-4 p-4 bg-slate-200 rounded-lg text-sm text-slate-700">
      <p><strong>User ID:</strong> {userId}</p>
    </div>
  </div>
);

export default ProfileMissingScreen;
