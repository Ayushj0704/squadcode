import { EventEmitter } from "node:events";

type ThreadPostEvent = {
  type: "thread-post";
  squadId: string;
  threadId: string;
  postId: string;
  authorUsername: string;
  createdAt: string;
};

const threadEvents = new EventEmitter();
threadEvents.setMaxListeners(0);

export function publishThreadPostEvent(event: ThreadPostEvent) {
  threadEvents.emit("thread-post", event);
}

export function onThreadPostEvent(listener: (event: ThreadPostEvent) => void) {
  threadEvents.on("thread-post", listener);
  return () => threadEvents.off("thread-post", listener);
}
