import dynamic from 'next/dynamic';
const Preview = dynamic(() => import('../AdminAccess'), { ssr: false });
export default function Home() { return <Preview />; }
