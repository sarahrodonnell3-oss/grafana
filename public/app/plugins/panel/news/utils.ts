import { FieldType, type DataFrame, dateTime } from '@grafana/data';
import { getLogger } from '@grafana/runtime/unstable';

import { type Feed } from './types';

export function feedToDataFrame(feed: Feed): DataFrame {
  const date: number[] = [];
  const title: string[] = [];
  const link: string[] = [];
  const content: string[] = [];
  const ogImage: Array<string | undefined | null> = [];

  for (const item of feed.items) {
    const val = dateTime(item.pubDate);

    try {
      date.push(val.valueOf());
      title.push(item.title);
      link.push(item.link);
      ogImage.push(item.ogImage);

      if (item.content) {
        const body = item.content.replace(/<\/?[^>]+(>|$)/g, '');
        content.push(body);
      }
    } catch (err) {
      getLogger('plugins/panel.news').logError(
        err instanceof Error ? err : new Error('Error reading news item', { cause: err }),
        { title: item.title ?? '', link: item.link ?? '' }
      );
    }
  }

  return {
    fields: [
      { name: 'date', type: FieldType.time, config: { displayName: 'Date' }, values: date },
      { name: 'title', type: FieldType.string, config: {}, values: title },
      { name: 'link', type: FieldType.string, config: {}, values: link },
      { name: 'content', type: FieldType.string, config: {}, values: content },
      { name: 'ogImage', type: FieldType.string, config: {}, values: ogImage },
    ],
    length: date.length,
  };
}
