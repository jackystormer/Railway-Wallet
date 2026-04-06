import { isDefined } from '@railgun-community/shared-models';
import { BridgeEvent } from '@react-shared';
import { isDev } from './config/dev-config';
import { triggerBridgeEvent } from './worker-ipc-service';

export const sendMessage = (msg: string) => {
  console.log('bridge message', msg);
  if (!isDev()) {
    return;
  }
  triggerBridgeEvent(BridgeEvent.Message, msg);
};

export const sendError = (error?: Error | string) => {
  if (!isDefined(error)) {
    return;
  }
  console.log('bridge error', error);
  if (!isDev()) {
    return;
  }
  triggerBridgeEvent(BridgeEvent.Error, error);
};

export const sendWakuMessage = (msg: string) => {
  console.log('waku message', msg);
  if (!isDev()) {
    return;
  }
  triggerBridgeEvent(BridgeEvent.WakuMessage, msg);
};

export const sendWakuError = (error?: Error | string) => {
  if (!isDefined(error)) {
    return;
  }
  console.log('waku error', error);
  if (!isDev()) {
    return;
  }
  triggerBridgeEvent(BridgeEvent.WakuError, error);
};