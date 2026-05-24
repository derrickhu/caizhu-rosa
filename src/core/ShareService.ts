import { Platform, type PlatformShareOptions } from './PlatformService';
import {
  SHARE_IMAGES,
  SHARE_TITLES,
  buildClassicRecordShareTitle,
  buildShareQuery,
} from '@/config/ShareConfig';
import { analytics } from '@/analytics';

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

  Platform.onShareAppMessage(() => {
    const payload = buildAppMessageShare('menu');
    analytics.trackShareAppMessage('wx_menu', {
      title: payload.title,
      imageUrl: payload.imageUrl,
      query: payload.query,
    });
    return payload;
  });
  Platform.onShareTimeline(() => {
    const payload = buildTimelineShare('timeline');
    analytics.trackShareTimeline('wx_timeline', {
      title: payload.title,
      imageUrl: payload.imageUrl,
      query: payload.query,
    });
    return payload;
  });
}

export function shareToFriend(source = 'button'): void {
  const payload = buildAppMessageShare(source);
  analytics.trackShareAppMessage(source === 'button' ? 'api_share_game' : `api_${source}`, {
    title: payload.title,
    imageUrl: payload.imageUrl,
    query: payload.query,
  });
  Platform.shareAppMessage(payload);
}

/** 经典模式破纪录：专用炫耀分享图 + 带分数的 title */
export function shareClassicRecord(score: number): void {
  const payload: PlatformShareOptions = {
    title: buildClassicRecordShareTitle(score),
    imageUrl: SHARE_IMAGES.classicRecord,
    query: buildShareQuery('classic_record'),
  };
  analytics.trackShareAppMessage('classic_record', {
    title: payload.title,
    imageUrl: payload.imageUrl,
    query: payload.query,
  });
  Platform.shareAppMessage(payload);
}
