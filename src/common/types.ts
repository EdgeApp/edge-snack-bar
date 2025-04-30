import { asEither, asNull, asNumber, asObject, asOptional, asString, asValue } from "cleaners";

export const asAsset = asObject({
  chainPluginId: asString,
  chainName: asOptional(asString),
  tokenId: asEither(asString, asNull),
  currencyCode: asString,
  uriType: asValue('bip21', 'eip831', 'stellar'), // Note: This could be more strict with literal types
  uriProtocol: asString, // Value before the ":". ie "bitcoin", "ethereum", "litecoin", etc.
  uriEvmChainId: asOptional(asNumber),
  tokenNumDecimals: asOptional(asNumber),
  publicAddress: asString
});

export type Asset = ReturnType<typeof asAsset>;

export interface AssetDoc extends Asset {
  _id: string;
  _rev: string;
} 