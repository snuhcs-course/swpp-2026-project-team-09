import { Injectable } from '@nestjs/common';
import { type Candidate, Grouping } from './grouping.js';

// The hashtags the candidate shares with each member of the group, added up.
function sharedHashtags(candidate: Candidate, group: readonly Candidate[]): number {
  const own = new Set(candidate.hashtags);
  return group.reduce((shared, member) => shared + new Set(member.hashtags.filter((tag) => own.has(tag))).size, 0);
}

// Starting from the earliest request left, a group takes the request that shares the most hashtags with the requests
// already in it, the earlier on a tie, until it is full. It forms groups while enough requests are left.
@Injectable()
export class HashtagGrouping implements Grouping {
  group(requests: readonly Candidate[], size: number): Promise<Candidate[][]> {
    const left = requests.toSorted((a, b) => a.arrivedAt.getTime() - b.arrivedAt.getTime());
    const groups: Candidate[][] = [];
    while (left.length >= size) {
      const group = left.splice(0, 1);
      while (group.length < size) {
        let best = 0;
        for (let index = 1; index < left.length; index += 1) {
          if (sharedHashtags(left[index], group) > sharedHashtags(left[best], group)) {
            best = index;
          }
        }
        group.push(...left.splice(best, 1));
      }
      groups.push(group);
    }
    return Promise.resolve(groups);
  }
}
