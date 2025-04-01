import { type FC } from 'react';
import { MenuBar } from '@/components/MenuBar';
import Conversations from '@/components/Conversations';

interface Props {
  className?: string;
}

const Index: FC<Props> = () => {
  return (
    <div className="flex h-screen flex-col">
      <MenuBar />
      <Conversations route="/" />
    </div>
  );
};

export default Index;
