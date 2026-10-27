import { render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';

import { Text } from '@/components/Text';
import { MAX_FONT_SCALE } from '@/theme/tokens';

/** Every rendered text node, so nested `<Text>` inside a value is covered too. */
function scales(node: unknown): unknown[] {
  if (!node || typeof node !== 'object') return [];
  const element = node as { props?: Record<string, unknown>; children?: unknown[] };
  const own = element.props && 'maxFontSizeMultiplier' in element.props
    ? [element.props.maxFontSizeMultiplier]
    : [];
  const nested = Array.isArray(element.children)
    ? element.children.flatMap((child) => scales(child))
    : [];
  return [...own, ...nested];
}

describe('Text', () => {
  it('bounds the system font scale inside fixed-size chrome', async () => {
    const tree = (await render(<Text>117</Text>)).toJSON();
    expect(scales(tree)).toEqual([MAX_FONT_SCALE]);
  });

  it('still lets a caller opt into a larger or fixed scale', async () => {
    const large = (await render(<Text maxFontSizeMultiplier={2}>Ringkasan</Text>)).toJSON();
    expect(scales(large)).toEqual([2]);

    const fixed = (await render(<Text allowFontScaling={false}>9:41</Text>)).toJSON();
    expect(scales(fixed)).toEqual([MAX_FONT_SCALE]);
  });

  it('does not leak the cap onto plain react-native text', async () => {
    const tree = (await render(<RNText>libre</RNText>)).toJSON();
    expect(scales(tree)).toEqual([]);
  });
});
