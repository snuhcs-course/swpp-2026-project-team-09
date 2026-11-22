/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { ChatInput, NOT_AUTOFILLED, SearchField, TextField } from '@/design-system';
import { AiInput } from '@/screens/main/ai-input';
import { Rename } from '@/screens/me/version-rename';
import { FixedField } from '@/screens/onboarding/fixed-field';
import { Input } from '@/screens/onboarding/input';

// Android's autofill once wrote the library login's saved ID into the AI input. No text field of the app asks for a
// credential, so each one tells autofill to leave it alone (P01 ticket 02).

const noop = (): void => undefined;

function expectNotAutofilled(label: string): void {
  const field = screen.getByLabelText(label);
  expect(field.props.autoComplete).toBe('off');
  expect(field.props.importantForAutofill).toBe('no');
  expect(field.props.textContentType).toBe('none');
}

describe('the text fields autofill leaves alone', () => {
  it('include the AI input', async () => {
    await render(<AiInput lift={0} onHeight={noop} onSend={noop} placeholder="이어서 말하기" />);

    expectNotAutofilled('AI에게 메시지');
  });

  it('include the design system’s chat input, search field and text field', async () => {
    await render(
      <>
        <ChatInput onSend={noop} />
        <SearchField label="검색" onChangeText={noop} placeholder="검색" value="" />
        <TextField label="소개" onChangeText={noop} value="" />
      </>,
    );

    expectNotAutofilled('메시지');
    expectNotAutofilled('검색');
    expectNotAutofilled('소개');
  });

  it('include the onboarding fields and the timetable’s new name', async () => {
    await render(
      <>
        <Input label="닉네임" onChangeText={noop} value="" />
        <FixedField label="학과" value="컴퓨터공학부" />
        <Rename name="시간표 1" onDone={noop} />
      </>,
    );

    expectNotAutofilled('닉네임');
    expectNotAutofilled('학과');
    expectNotAutofilled('시간표 이름');
  });

  it('are told off, no and none', () => {
    expect(NOT_AUTOFILLED).toEqual({ autoComplete: 'off', importantForAutofill: 'no', textContentType: 'none' });
  });
});
