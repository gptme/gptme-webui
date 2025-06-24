import { type FC } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { MenuBar } from '@/components/MenuBar';
import Conversations from '@/components/Conversations';

interface Props {
  className?: string;
}

const Index: FC<Props> = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();

  // Determine the route for the Conversations component
  const route = location.pathname.startsWith('/chat') ? '/chat' : '/';

  return (
    <div className="flex h-screen flex-col">
      <MenuBar />
      <Conversations route={route} conversationId={id} />
    </div>
  );
};

export default Index;
