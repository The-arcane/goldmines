
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the main login by default.
  redirect('/login');
  return null;
}
