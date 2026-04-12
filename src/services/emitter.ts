import mitt from 'mitt';
import type { EventPayloads } from '@/types';
const emitter = mitt<EventPayloads>();
export default emitter;