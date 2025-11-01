
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the salesperson login by default, can be changed later.
  redirect('/salesperson/login');
  return null;
}
