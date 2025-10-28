import { mul, round } from 'biggystring'
import { asArray, asNumber, asObject, asOptional, asString } from 'cleaners'
import { QRCodeSVG } from 'qrcode.react'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { Asset } from '../../common/types'
import { retryFetch } from '../../common/utils'

const REFRESH_RATE = 60000

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`

const AssetTitle = styled.h2`
  margin-bottom: 20px;
`

const QRContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CenteredAssetIconContainer = styled.div`
  position: absolute;
  width: 38px;
  height: 38px;
  z-index: 1;
`

const CenteredAssetIcon = styled.img`
  width: 38px;
  height: 38px;
`

const CenteredChainIcon = styled.img`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: white;
  padding: 1px;
`

const Spinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0c2550;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 103px; /* (256px - 50px) / 2 to center in QR space */

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`

const QuantitySection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 30px 0;
`

const QuantityButtons = styled.div`
  display: flex;
  gap: 12px;
`

const QuantityButton = styled.button<{ active: boolean }>`
  padding: 18px 36px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: ${props => (props.active ? '#98FB98' : '#f0f0f0')};
  font-size: 21px;
  &:hover {
    opacity: 0.8;
  }
`

const BackButton = styled.button`
  padding: 18px 72px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #0c2550 0%, #1a56f0 100%);
  color: white;
  font-size: 21px;
  &:hover {
    opacity: 0.9;
  }
`

const AmountSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 0 2rem 0;
  font-size: 21px;
`

const AmountText = styled.div`
  text-align: center;
`

const asRatesResponse = asObject({
  targetFiat: asString,
  crypto: asArray(
    asObject({
      isoDate: asOptional(asString),
      asset: asObject({
        pluginId: asString,
        tokenId: asOptional(asString)
      }),
      rate: asNumber
    })
  ),
  fiat: asArray(
    asObject({
      isoDate: asOptional(asString),
      rate: asNumber
    })
  )
})

export const PaymentScreen = (): React.ReactElement | null => {
  const { state } = useLocation()
  const asset = state?.asset as Asset
  const [baseAmount, setBaseAmount] = useState<string | undefined>()
  const [quantity, setQuantity] = useState<number>(1)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRate = async (): Promise<void> => {
      try {
        const body = {
          targetFiat: 'USD',
          crypto: [
            {
              asset: {
                pluginId: asset.chainPluginId,
                tokenId: asset.tokenId
              }
            }
          ],
          fiat: []
        }

        const response = await retryFetch(`https://rates3.edge.app/v3/rates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
        const data = await response.json()
        const cleaned = asRatesResponse(data)
        const { rate } = cleaned.crypto[0]
        console.log('exchangeRate', rate)
        const exchangeRate = String(1 / rate)
        setBaseAmount(exchangeRate)
      } catch (error) {
        console.error('Failed to fetch rate:', error)
      }
    }

    // Initial fetch
    fetchRate().catch(console.error)

    // Set up interval
    const interval = setInterval(() => {
      fetchRate().catch(console.error)
    }, REFRESH_RATE)

    // Clean up interval on unmount
    return () => {
      clearInterval(interval)
    }
  }, [asset]) // Reset interval when asset changes

  const getScaledAmount = (): string => {
    if (baseAmount == null) return '0'
    return mul(baseAmount, quantity.toString())
  }

  const getIconUrl = (asset: Asset): string => {
    const baseUrl = 'https://content.edge.app/currencyIconsV3'
    return asset.tokenId != null && asset.tokenId !== ''
      ? `${baseUrl}/${asset.chainPluginId}/${asset.tokenId}.png`
      : `${baseUrl}/${asset.chainPluginId}/${asset.chainPluginId}.png`
  }

  const getChainIconUrl = (chainPluginId: string): string => {
    const baseUrl = 'https://content.edge.app/currencyIconsV3'
    return `${baseUrl}/${chainPluginId}/${chainPluginId}.png`
  }

  const getPaymentUri = (asset: Asset): { amount: string; uri: string } => {
    const scaledAmount = getScaledAmount()
    const {
      uriProtocol,
      uriType,
      uriEvmChainId,
      publicAddress,
      tokenId,
      tokenNumDecimals
    } = asset

    switch (uriType) {
      case 'bip21': {
        const amount = round(scaledAmount, -8)
        if (uriProtocol === 'monero') {
          return {
            amount,
            uri: `${uriProtocol}:${publicAddress}?tx_amount=${amount}`
          }
        }
        // BIP-21 format: bitcoin:<address>?amount=<amount>
        return {
          amount,
          uri: `${uriProtocol}:${publicAddress}?amount=${amount}`
        }
      }
      case 'eip831': {
        // EIP-681 format for native ETH: ethereum:<address>@<chain_id>?value=<amount_in_wei>
        // EIP-681 format for tokens: ethereum:<token_contract>@<chain_id>/transfer?address=<recipient>&uint256=<amount_in_wei>
        const amount = round(scaledAmount, -18)
        if (uriEvmChainId == null) {
          throw new Error('EVM chain ID is required for EIP-681 URIs')
        }
        if (tokenId != null) {
          if (tokenNumDecimals == null) {
            throw new Error(
              'Token number of decimals is required for EIP-681 token transfer URIs'
            )
          }

          // Token transfer
          const amountInWei = (
            Number(amount) * Math.pow(10, tokenNumDecimals)
          ).toString()
          const contractAddress = `0x${tokenId}`
          return {
            amount,
            uri: `ethereum:${contractAddress}@${uriEvmChainId}/transfer?address=${publicAddress}&uint256=${amountInWei}`
          }
        } else {
          // Native ETH transfer
          const amountInWei = (Number(round(amount, -18)) * 1e18).toString()
          return {
            amount,
            uri: `ethereum:${publicAddress}@${uriEvmChainId}?value=${amountInWei}`
          }
        }
      }
      case 'stellar': {
        const amount = round(scaledAmount, -7)
        return {
          amount,
          uri: `${uriProtocol}:pay?destination=${publicAddress}&amount=${amount}`
        }
      }
      default:
        throw new Error(`Unsupported URI type: ${uriType as string}`)
    }
  }

  if (asset == null) return null
  const chainName = asset.chainName ?? asset.chainPluginId
  const displayName = `${chainName.charAt(0).toUpperCase()}${chainName.slice(1)} (${asset.currencyCode})`

  const getDisplayAmount = (): string => {
    if (baseAmount == null) return ''

    const { amount } = getPaymentUri(asset)
    return `$${quantity} (${amount} ${asset.currencyCode})`
  }

  return (
    <Container>
      <AssetTitle>{'Scan to pay with ' + displayName}</AssetTitle>
      <QRContainer>
        {baseAmount == null ? (
          <Spinner />
        ) : (
          <>
            <CenteredAssetIconContainer>
              <CenteredAssetIcon
                src={getIconUrl(asset)}
                alt={asset.chainPluginId}
              />
              {asset.tokenId != null && asset.tokenId !== '' && (
                <CenteredChainIcon
                  src={getChainIconUrl(asset.chainPluginId)}
                  alt={`${chainName} chain`}
                />
              )}
            </CenteredAssetIconContainer>
            <QRCodeSVG value={getPaymentUri(asset).uri} size={256} />
          </>
        )}
      </QRContainer>
      <QuantitySection>
        <QuantityButtons>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
            <QuantityButton
              key={num}
              active={quantity === num}
              onClick={() => {
                setQuantity(num)
              }}
            >
              {num}
            </QuantityButton>
          ))}
        </QuantityButtons>
      </QuantitySection>
      <AmountSection>
        <AmountText>{getDisplayAmount()}</AmountText>
      </AmountSection>
      <BackButton
        onClick={() => {
          navigate('/')
        }}
      >
        Back
      </BackButton>
    </Container>
  )
}
