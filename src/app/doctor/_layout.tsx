import { Stack } from 'expo-router';

import { DoctorChrome } from '@/components/doctor/doctor-chrome';

export default function DoctorLayout() {
  return (
    <DoctorChrome>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      />
    </DoctorChrome>
  );
}
