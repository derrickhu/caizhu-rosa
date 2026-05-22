import { Platform, type PlatformShareOptions } from './PlatformService';
import { SHARE_IMAGES, SHARE_TITLES, buildShareQuery } from '@/config/ShareConfig';

function buildAppMessageShare(source: string): PlatformShareOptions {
  return {
    title: SHARE_TITLES.appMessage,
    imageUrl: SHARE_IMAGES.appMessage,
    query: buildShareQuery(source),
  };
}

function buildTimelineShare(source: string): PlatformShareOptions {
  return {
    title: SHARE_TITLES.timeline,
    imageUrl: SHARE_IMAGES.timeline,
    query: buildShareQuery(source),
  };
}

export function configureWechatShare(): void {
  if (!Platform.isWechat) return;

  Platform.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });

  Platform.onShareAppMessage(() => buildAppMessageShare('menu'));
  Platform.onShareTimeline(() => buildTimelineShare('timeline'));
}

export function shareToFriend(source = 'button'): void {
  Platform.shareAppMessage(buildAppMessageShare(source));
}
