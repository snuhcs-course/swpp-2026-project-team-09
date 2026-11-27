/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ConditionChip } from '@/api/assistant-types';
import type { LookupAction, LookupCard } from '@/api/lookup-types';
import type { Place } from '@/api/types';
import { Button, color, RoundIcon, space, text, WaitingDots } from '@/design-system';
import { useTapAnswer } from '@/features/assistant/use-tap-answer';
import { cardId } from '@/features/map/adapter';
import { Chips } from './answer/lookup-card';
import { CardFacts } from './card-facts';
import { CardFrame, CloseButton } from './card';
import type { ChatSheetControl } from './chat-sheet';
import { placeWords } from './my-card';
import { type PlanAction, usePlanAsk } from './use-plan-ask';
import type { MainRoute } from './use-route';
import type { Selection } from './use-selection';
import { FAILURE } from './answer/line-types';

type GuideAction = Extract<LookupAction, { kind: 'guide' }>;

interface PlaceCardProps {
  place: Place;
  selection: Selection;
  chat: ChatSheetControl;
  route: MainRoute;
  onHeight: (height: number) => void;
}

// Every `plan` button: the frame draws a meal's answer, and those of events and parties ("행사 보기", "같이 갈 파티").
function shownPlans(actions: readonly LookupAction[]): PlanAction[] {
  return actions.filter((action): action is PlanAction => action.kind === 'plan');
}

function Head({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string | null;
  onClose: () => void;
}): ReactElement {
  return (
    <View style={styles.head}>
      <RoundIcon fill={color.questSoft} icon="pin" ink={color.quest} />
      <View style={styles.titles}>
        <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {subtitle === null ? null : <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <CloseButton onClose={onClose} />
    </View>
  );
}

interface ButtonsProps {
  actions: readonly LookupAction[];
  plan: ReturnType<typeof usePlanAsk>;
  onGuide: (action: GuideAction) => void;
}

// Each `plan` by its label, then the way as "가는 길", in cells of one width; the first is the main one.
function Buttons({ actions, plan, onGuide }: ButtonsProps): ReactElement {
  const guide = actions.find((action): action is GuideAction => action.kind === 'guide');
  const plans = shownPlans(actions);
  return (
    <View style={styles.buttons}>
      {plans.map((action, index) => (
        <View key={action.label} style={styles.cell}>
          <Button
            busy={plan.asked === action.label}
            disabled={plan.asking && plan.asked !== action.label}
            full
            onPress={() => {
              plan.ask(action);
            }}
            variant={index === 0 ? 'primary' : 'secondary'}
          >
            {action.label}
          </Button>
        </View>
      ))}
      {guide === undefined ? null : (
        <View style={styles.cell}>
          <Button
            full
            onPress={() => {
              onGuide(guide);
            }}
            variant={plans.length === 0 ? 'primary' : 'secondary'}
          >
            가는 길
          </Button>
        </View>
      )}
    </View>
  );
}

interface AnsweredProps extends ButtonsProps {
  card: LookupCard;
  chips: readonly ConditionChip[];
  basis: readonly string[];
  onFriend: (userId: string) => void;
}

// The card as the main server wrote it: the facts, the note in the Quest colour, the chips with the basis, and the
// buttons. Only what the card gives is drawn.
function Answered({ card, chips, basis, onFriend, ...buttons }: AnsweredProps): ReactElement {
  const [basisOpen, setBasisOpen] = useState(false);
  return (
    <>
      <CardFacts facts={card.facts} onFriend={onFriend} />
      {card.note === null ? null : <Text style={styles.note}>{card.note}</Text>}
      {chips.length === 0 && basis.length === 0 ? null : (
        <Chips
          basis={{
            open: basisOpen,
            toggle: () => {
              setBasisOpen((open) => !open);
            },
          }}
          chips={chips}
        />
      )}
      {basisOpen
        ? basis.map((line) => (
            <Text key={line} style={styles.basis}>
              {line}
            </Text>
          ))
        : null}
      <Buttons {...buttons} />
    </>
  );
}

// While the card is asked, and after a failure, as row 8 words it.
function NotYet({ failed, onRetry }: { failed: boolean; onRetry: () => void }): ReactElement {
  return (
    <View style={styles.notYet}>
      {failed ? <Text style={styles.failed}>답을 가져오지 못했어요</Text> : <WaitingDots label="보는 중이에요" />}
      {failed ? (
        <Button onPress={onRetry} variant="secondary">
          다시 시도
        </Button>
      ) : null}
    </View>
  );
}

// The card of a building pressed on the everyday map (P02 ticket 22): the Place's name while the main server is
// asked, with the waiting dots ("보는 중이에요"), then its card. A failure says so, with "다시 시도". A Friend's line opens that
// Friend's card, "가는 길" starts the route guidance and closes the card, and a `plan` button opens its answer in
// the frame.
export function PlaceCard({ place, selection, chat, route, onHeight }: PlaceCardProps): ReactElement {
  const tap = useTapAnswer({ kind: 'place', placeId: place.id });
  const card = tap.answer?.card ?? null;
  const title = card?.title ?? placeWords(place);
  const plan = usePlanAsk(chat.chat.addRecalculated, title);
  return (
    <CardFrame onHeight={onHeight}>
      <Head
        onClose={selection.close}
        subtitle={card === null ? (place.number === null ? null : place.name) : card.subtitle}
        title={title}
      />
      {tap.answer === null ? (
        <NotYet failed={tap.failed} onRetry={tap.retry} />
      ) : (
        <Answered
          actions={tap.answer.actions}
          basis={tap.answer.basis}
          card={tap.answer.card}
          chips={tap.answer.chips}
          onFriend={(userId) => {
            selection.select(cardId.friend(userId));
          }}
          onGuide={({ to }) => {
            if (route.routeTo({ title: to.label, position: { latitude: to.latitude, longitude: to.longitude } })) {
              selection.close();
            }
          }}
          plan={plan}
        />
      )}
    </CardFrame>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  titles: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  title: { ...text.title, color: color.ink },
  subtitle: { ...text.caption, color: color.inkMuted },
  notYet: { alignItems: 'flex-start', gap: space[2] },
  status: { ...text.body, color: color.inkMuted },
  // A failure, as every failure line is (P01 ticket 19).
  failed: FAILURE,
  note: { ...text.body, color: color.quest },
  basis: { ...text.body, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2] },
  cell: { flex: 1 },
});
