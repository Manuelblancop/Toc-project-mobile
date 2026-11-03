import { Stack } from 'expo-router';

import { ProfesionalChrome } from '@/components/doctor/profesional-chrome';

export default function DoctorLayout() {
  return (
    <ProfesionalChrome>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      />
    </ProfesionalChrome>
  );
}
