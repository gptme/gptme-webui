import { type FC } from 'react';
import { MenuBar } from '@/components/MenuBar';
import { TaskManager } from '@/components/TaskManager';

interface Props {
  className?: string;
}

const Tasks: FC<Props> = () => {
  return (
    <div className="flex h-screen flex-col">
      <MenuBar />
      <TaskManager />
    </div>
  );
};

export default Tasks;
