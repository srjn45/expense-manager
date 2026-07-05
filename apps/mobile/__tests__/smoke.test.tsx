import { fireEvent, render } from '@testing-library/react-native'

import { AmountText, Button } from '@/components'

describe('primitives smoke test', () => {
  it('renders a Button and fires onPress', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<Button label="Add expense" onPress={onPress} />)

    fireEvent.press(getByRole('button', { name: 'Add expense' }))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('AmountText renders a debit with a minus sign and 2-decimal INR', () => {
    const { getByTestId } = render(<AmountText amountMinor={-125000} currency="INR" testID="amt" />)
    // -1250.00 INR: leading U+2212 minus, grouped thousands, 2 minor-unit digits.
    expect(getByTestId('amt')).toHaveTextContent('−₹1,250.00')
  })

  it('AmountText renders a credit with a plus sign', () => {
    const { getByTestId } = render(<AmountText amountMinor={90000} currency="INR" testID="amt" />)
    expect(getByTestId('amt')).toHaveTextContent('+₹900.00')
  })
})
