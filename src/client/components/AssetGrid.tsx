import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Asset } from '../../common/types';
import { getApiBaseUrl } from '../api/baseUrl';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 30px;
  padding: 40px;
  overflow-x: hidden;
  overflow-y: auto;
  margin-top: 20px;
  margin-bottom: 40px;
`;

const AssetItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
`;

const AssetIconContainer = styled.div`
  position: relative;
  width: 90px;
  height: 90px;
`;

const AssetIcon = styled.img`
  width: 90px;
  height: 90px;
`;

const ChainIcon = styled.img`
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: white;
  padding: 2px;
`;

const AssetName = styled.span`
  margin-top: 8px;
  text-align: center;
  font-size: 18px;
`;

export const AssetGrid = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssets = async () => {
      const response = await fetch(`${getApiBaseUrl()}/api/assets`);
      const data = await response.json();
      setAssets(data);
    };
    fetchAssets();
  }, []);

  const getIconUrl = (asset: Asset) => {
    const baseUrl = 'https://content.edge.app/currencyIconsV3';
    return asset.tokenId
      ? `${baseUrl}/${asset.chainPluginId}/${asset.tokenId}.png`
      : `${baseUrl}/${asset.chainPluginId}/${asset.chainPluginId}.png`;
  };

  const getChainIconUrl = (chainPluginId: string) => {
    const baseUrl = 'https://content.edge.app/currencyIconsV3';
    return `${baseUrl}/${chainPluginId}/${chainPluginId}.png`;
  };

  return (
    <Grid>
      {assets.sort((a, b) => {
        const aDisplayName = a.chainName ?? a.chainPluginId
        const bDisplayName = b.chainName ?? b.chainPluginId
        return aDisplayName < bDisplayName ? -1 : 1
      }).map((asset) => {
        const { chainPluginId,  } = asset;
        const { chainName = chainPluginId,tokenId, currencyCode } = asset;
        return (
          <AssetItem
            key={`${chainPluginId}-${tokenId}`}
            onClick={() => navigate('/pay', {
              state: { asset }
            })}
          >
            <AssetIconContainer>
              <AssetIcon src={getIconUrl(asset)} alt={chainPluginId} />
              {tokenId && (
                <ChainIcon 
                  src={getChainIconUrl(chainPluginId)} 
                  alt={`${chainName} chain`} 
                />
              )}
            </AssetIconContainer>
            <AssetName>{`${chainName.charAt(0).toUpperCase()}${chainName.slice(1)} (${currencyCode})`}</AssetName>
          </AssetItem>
        );
      })}
    </Grid>
  );
}; 