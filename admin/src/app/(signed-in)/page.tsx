import { redirect } from 'next/navigation';

// The home page holds the Global Events from ticket 04 on. Until then it opens the Administrators screen.
export default function HomePage(): never {
  redirect('/administrators');
}
