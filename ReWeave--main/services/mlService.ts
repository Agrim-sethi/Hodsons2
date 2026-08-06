import { Listing, User } from '../types';

/**
 * ReWeave ML Service
 * Provides intelligent recommendations, price predictions, and market insights
 * using statistical algorithms and heuristic-based ML approaches.
 */

// Market data constants (simulated historical data for the algorithm)
const MATERIAL_BASE_PRICES: Record<string, number> = {
  'cotton': 350,
  'silk': 1200,
  'linen': 500,
  'wool': 800,
  'polyester': 200,
  'denim': 450,
  'velvet': 650,
  'chiffon': 400,
  'satin': 550,
  'hemp': 380,
  'jute': 180,
  'rayon': 280,
  'nylon': 220,
  'leather': 1500,
  'default': 400
};

const LOCATION_DEMAND_INDEX: Record<string, number> = {
  'mumbai': 1.15,
  'delhi': 1.12,
  'bangalore': 1.10,
  'chennai': 1.08,
  'kolkata': 1.05,
  'ahmedabad': 1.08,
  'surat': 1.20, // Textile hub
  'tirupur': 1.18, // Textile hub
  'coimbatore': 1.12,
  'jaipur': 1.10,
  'default': 1.0
};

// Seasonal demand factors (month-based)
const SEASONAL_FACTORS: Record<number, Record<string, number>> = {
  1: { 'wool': 1.3, 'velvet': 1.2, 'cotton': 0.9 }, // January - winter
  2: { 'wool': 1.2, 'velvet': 1.1, 'cotton': 0.95 },
  3: { 'cotton': 1.1, 'linen': 1.1, 'silk': 1.15 }, // March - spring
  4: { 'cotton': 1.15, 'linen': 1.2, 'chiffon': 1.2 },
  5: { 'cotton': 1.2, 'linen': 1.25, 'chiffon': 1.3 }, // Summer begins
  6: { 'cotton': 1.25, 'linen': 1.3, 'rayon': 1.2 },
  7: { 'cotton': 1.2, 'linen': 1.25 }, // Monsoon
  8: { 'cotton': 1.15, 'silk': 1.1 },
  9: { 'silk': 1.25, 'velvet': 1.1 }, // Festival season begins
  10: { 'silk': 1.35, 'velvet': 1.2, 'brocade': 1.3 }, // Diwali
  11: { 'silk': 1.3, 'wool': 1.15, 'velvet': 1.25 },
  12: { 'wool': 1.35, 'velvet': 1.3, 'silk': 1.2 } // Winter/Wedding season
};

export interface PriceRecommendation {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidence: number;
  factors: {
    name: string;
    impact: string;
    value: number;
  }[];
  insight: string;
}

export interface DemandPrediction {
  demandScore: number; // 0-100
  trend: 'rising' | 'stable' | 'declining';
  bestTimeToSell: string;
  competitionLevel: 'low' | 'medium' | 'high';
  insight: string;
}

export interface ListingRecommendation {
  listing: Listing;
  matchScore: number;
  reasons: string[];
}

export interface MarketInsight {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  description: string;
  icon: string;
}

export interface MaterialTrend {
  material: string;
  demandScore: number;
  priceChangePercent: number;
  avgPrice: number;
  trend: 'rising' | 'stable' | 'falling';
}

export interface AggregatedMarketInsights {
  marketHealthScore: number;
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  priceChange: number;
  topMaterial: string;
  recommendations: Array<{
    type: 'opportunity' | 'warning' | 'action' | 'info';
    message: string;
  }>;
}

export const mlService = {
  /**
   * Predict optimal price for a fabric listing
   * Uses multiple factors: material, quantity, location, seasonality, market conditions
   */
  predictPrice: (
    material: string,
    quantity: number,
    unit: 'm' | 'kg',
    location: string,
    existingListings: Listing[]
  ): PriceRecommendation => {
    const factors: PriceRecommendation['factors'] = [];
    
    // 1. Base price from material
    const materialLower = material.toLowerCase();
    let basePrice = MATERIAL_BASE_PRICES['default'];
    for (const [key, price] of Object.entries(MATERIAL_BASE_PRICES)) {
      if (materialLower.includes(key)) {
        basePrice = price;
        break;
      }
    }
    factors.push({
      name: 'Material Base',
      impact: 'primary',
      value: basePrice
    });

    // 2. Location demand adjustment
    const locationLower = location.toLowerCase();
    let locationMultiplier = LOCATION_DEMAND_INDEX['default'];
    for (const [key, multiplier] of Object.entries(LOCATION_DEMAND_INDEX)) {
      if (locationLower.includes(key)) {
        locationMultiplier = multiplier;
        break;
      }
    }
    factors.push({
      name: 'Location Demand',
      impact: locationMultiplier > 1.1 ? 'positive' : 'neutral',
      value: Math.round((locationMultiplier - 1) * 100)
    });

    // 3. Seasonal adjustment
    const currentMonth = new Date().getMonth() + 1;
    const seasonalFactors = SEASONAL_FACTORS[currentMonth] || {};
    let seasonalMultiplier = 1.0;
    for (const [key, multiplier] of Object.entries(seasonalFactors)) {
      if (materialLower.includes(key)) {
        seasonalMultiplier = multiplier;
        break;
      }
    }
    factors.push({
      name: 'Seasonal Demand',
      impact: seasonalMultiplier > 1.1 ? 'positive' : seasonalMultiplier < 0.95 ? 'negative' : 'neutral',
      value: Math.round((seasonalMultiplier - 1) * 100)
    });

    // 4. Quantity discount/premium
    let quantityMultiplier = 1.0;
    if (quantity > 500) {
      quantityMultiplier = 0.85; // Bulk discount
    } else if (quantity > 200) {
      quantityMultiplier = 0.92;
    } else if (quantity < 20) {
      quantityMultiplier = 1.1; // Small quantity premium
    }
    factors.push({
      name: 'Quantity Factor',
      impact: quantityMultiplier < 1 ? 'discount' : quantityMultiplier > 1 ? 'premium' : 'neutral',
      value: Math.round((1 - quantityMultiplier) * 100)
    });

    // 5. Market competition analysis
    const similarListings = existingListings.filter(l => 
      l.material.toLowerCase().includes(materialLower) || 
      materialLower.includes(l.material.toLowerCase())
    );
    
    let marketMultiplier = 1.0;
    if (similarListings.length > 0) {
      const avgPrice = similarListings.reduce((sum, l) => sum + l.pricePerUnit, 0) / similarListings.length;
      // Adjust towards market average
      marketMultiplier = 0.7 + (0.3 * (avgPrice / basePrice));
      marketMultiplier = Math.max(0.8, Math.min(1.2, marketMultiplier));
    }
    factors.push({
      name: 'Market Competition',
      impact: similarListings.length > 5 ? 'high' : similarListings.length > 2 ? 'medium' : 'low',
      value: similarListings.length
    });

    // Calculate final price
    const suggestedPrice = Math.round(
      basePrice * locationMultiplier * seasonalMultiplier * quantityMultiplier * marketMultiplier
    );

    // Calculate range
    const minPrice = Math.round(suggestedPrice * 0.85);
    const maxPrice = Math.round(suggestedPrice * 1.15);

    // Calculate confidence based on data availability
    let confidence = 0.6; // Base confidence
    if (similarListings.length > 5) confidence += 0.2;
    if (similarListings.length > 10) confidence += 0.1;
    if (locationMultiplier !== LOCATION_DEMAND_INDEX['default']) confidence += 0.05;
    confidence = Math.min(0.95, confidence);

    // Generate insight
    let insight = '';
    if (seasonalMultiplier > 1.1) {
      insight = `Great timing! ${material} is in high demand this season. Consider pricing at the higher end.`;
    } else if (seasonalMultiplier < 0.95) {
      insight = `${material} demand is lower this season. Competitive pricing may help with quicker sales.`;
    } else if (similarListings.length > 5) {
      insight = `There's good market activity for ${material}. Price competitively to stand out.`;
    } else {
      insight = `Limited market data for ${material}. The suggested price is based on material quality and location.`;
    }

    return {
      suggestedPrice,
      minPrice,
      maxPrice,
      confidence,
      factors,
      insight
    };
  },

  /**
   * Predict demand for a specific material/product
   */
  predictDemand: (
    material: string,
    location: string,
    existingListings: Listing[]
  ): DemandPrediction => {
    const materialLower = material.toLowerCase();
    const currentMonth = new Date().getMonth() + 1;
    
    // Base demand score
    let demandScore = 50;
    
    // Seasonal adjustment
    const seasonalFactors = SEASONAL_FACTORS[currentMonth] || {};
    for (const [key, multiplier] of Object.entries(seasonalFactors)) {
      if (materialLower.includes(key)) {
        demandScore += (multiplier - 1) * 100;
        break;
      }
    }

    // Location adjustment
    const locationLower = location.toLowerCase();
    for (const [key, multiplier] of Object.entries(LOCATION_DEMAND_INDEX)) {
      if (locationLower.includes(key)) {
        demandScore += (multiplier - 1) * 50;
        break;
      }
    }

    // Market activity
    const recentListings = existingListings.filter(l => {
      const listDate = new Date(l.dateListed);
      const daysDiff = (Date.now() - listDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30 && (
        l.material.toLowerCase().includes(materialLower) ||
        materialLower.includes(l.material.toLowerCase())
      );
    });

    const soldListings = recentListings.filter(l => l.status === 'Sold').length;
    const totalListings = recentListings.length;
    
    if (totalListings > 0) {
      const sellThroughRate = soldListings / totalListings;
      demandScore += sellThroughRate * 30;
    }

    demandScore = Math.max(0, Math.min(100, Math.round(demandScore)));

    // Determine trend
    let trend: DemandPrediction['trend'] = 'stable';
    const nextMonthFactors = SEASONAL_FACTORS[(currentMonth % 12) + 1] || {};
    const currentSeasonalFactor = seasonalFactors[materialLower] || 1;
    const nextSeasonalFactor = nextMonthFactors[materialLower] || 1;
    
    if (nextSeasonalFactor > currentSeasonalFactor * 1.05) {
      trend = 'rising';
    } else if (nextSeasonalFactor < currentSeasonalFactor * 0.95) {
      trend = 'declining';
    }

    // Best time to sell
    let bestMonth = currentMonth;
    let bestFactor = 0;
    for (let m = 1; m <= 12; m++) {
      const factors = SEASONAL_FACTORS[m] || {};
      const factor = factors[materialLower] || 1;
      if (factor > bestFactor) {
        bestFactor = factor;
        bestMonth = m;
      }
    }
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const bestTimeToSell = bestMonth === currentMonth ? 'Now!' : monthNames[bestMonth - 1];

    // Competition level
    let competitionLevel: DemandPrediction['competitionLevel'] = 'low';
    const availableListings = existingListings.filter(l => 
      l.status === 'Available' && (
        l.material.toLowerCase().includes(materialLower) ||
        materialLower.includes(l.material.toLowerCase())
      )
    ).length;
    
    if (availableListings > 10) competitionLevel = 'high';
    else if (availableListings > 5) competitionLevel = 'medium';

    // Generate insight
    let insight = '';
    if (demandScore >= 70) {
      insight = `High demand detected for ${material}! This is a great time to list your inventory.`;
    } else if (demandScore >= 50) {
      insight = `Steady demand for ${material}. Price competitively for best results.`;
    } else {
      insight = `Lower demand period for ${material}. Consider waiting or offering competitive prices.`;
    }

    if (trend === 'rising') {
      insight += ` Demand is expected to increase next month.`;
    }

    return {
      demandScore,
      trend,
      bestTimeToSell,
      competitionLevel,
      insight
    };
  },

  /**
   * Get personalized listing recommendations for a buyer
   * Uses collaborative filtering + content-based hybrid approach
   */
  getRecommendations: (
    user: User,
    userInterests: string[],
    allListings: Listing[],
    limit: number = 6
  ): ListingRecommendation[] => {
    const availableListings = allListings.filter(l => l.status === 'Available');
    
    if (availableListings.length === 0) return [];

    const scoredListings: ListingRecommendation[] = availableListings.map(listing => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Interest-based matching (if user has shown interest in similar items)
      const interestedListings = allListings.filter(l => userInterests.includes(l.id));
      
      // Material similarity
      const interestedMaterials = interestedListings.map(l => l.material.toLowerCase());
      if (interestedMaterials.some(m => listing.material.toLowerCase().includes(m) || m.includes(listing.material.toLowerCase()))) {
        score += 30;
        reasons.push('Similar to fabrics you liked');
      }

      // Location preference
      const interestedLocations = interestedListings.map(l => l.location.toLowerCase());
      if (interestedLocations.some(loc => listing.location.toLowerCase().includes(loc))) {
        score += 15;
        reasons.push('From a location you prefer');
      }

      // Price range preference
      if (interestedListings.length > 0) {
        const avgInterestedPrice = interestedListings.reduce((sum, l) => sum + l.pricePerUnit, 0) / interestedListings.length;
        if (Math.abs(listing.pricePerUnit - avgInterestedPrice) / avgInterestedPrice < 0.3) {
          score += 20;
          reasons.push('Within your typical price range');
        }
      }

      // 2. User type matching
      if (user.type === 'Buyer' || user.type === 'Designer') {
        // Prefer smaller quantities for designers
        if (user.type === 'Designer' && listing.qty < 50) {
          score += 15;
          reasons.push('Suitable quantity for design projects');
        }
      } else if (user.type === 'Recycler') {
        // Recyclers prefer larger quantities
        if (listing.qty > 100) {
          score += 15;
          reasons.push('Good quantity for recycling');
        }
      }

      // 3. Freshness score (newer listings get a boost)
      const daysOld = (Date.now() - new Date(listing.dateListed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 3) {
        score += 20;
        reasons.push('New listing');
      } else if (daysOld < 7) {
        score += 10;
        reasons.push('Recently listed');
      }

      // 4. Seasonal relevance
      const currentMonth = new Date().getMonth() + 1;
      const seasonalFactors = SEASONAL_FACTORS[currentMonth] || {};
      for (const [material, factor] of Object.entries(seasonalFactors)) {
        if (listing.material.toLowerCase().includes(material) && factor > 1.1) {
          score += 15;
          reasons.push('In-season fabric');
          break;
        }
      }

      // 5. Value score (good price vs market)
      const materialLower = listing.material.toLowerCase();
      let basePrice = MATERIAL_BASE_PRICES['default'];
      for (const [key, price] of Object.entries(MATERIAL_BASE_PRICES)) {
        if (materialLower.includes(key)) {
          basePrice = price;
          break;
        }
      }
      if (listing.pricePerUnit < basePrice * 0.9) {
        score += 20;
        reasons.push('Great value');
      }

      // Add some randomness for diversity (exploration vs exploitation)
      score += Math.random() * 10;

      return {
        listing,
        matchScore: Math.min(100, Math.round(score)),
        reasons: reasons.slice(0, 3) // Limit to top 3 reasons
      };
    });

    // Sort by score and return top recommendations
    return scoredListings
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  },

  /**
   * Generate market insights for analytics dashboard
   */
  getMarketInsights: (listings: Listing[]): MarketInsight[] => {
    const insights: MarketInsight[] = [];
    const availableListings = listings.filter(l => l.status === 'Available');
    const soldListings = listings.filter(l => l.status === 'Sold');
    const recentListings = listings.filter(l => {
      const daysDiff = (Date.now() - new Date(l.dateListed).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    // 1. Average market price
    if (availableListings.length > 0) {
      const avgPrice = Math.round(availableListings.reduce((sum, l) => sum + l.pricePerUnit, 0) / availableListings.length);
      insights.push({
        title: 'Average Market Price',
        value: `₹${avgPrice}/unit`,
        trend: 'stable',
        description: 'Current average price across all available fabrics',
        icon: 'payments'
      });
    }

    // 2. Market activity
    insights.push({
      title: 'Active Listings',
      value: availableListings.length,
      change: recentListings.length,
      trend: recentListings.length > 5 ? 'up' : 'stable',
      description: `${recentListings.length} new listings in the last 30 days`,
      icon: 'inventory_2'
    });

    // 3. Sell-through rate
    const totalCompleted = soldListings.length + listings.filter(l => l.status === 'Reserved').length;
    const sellThroughRate = listings.length > 0 ? Math.round((totalCompleted / listings.length) * 100) : 0;
    insights.push({
      title: 'Sell-Through Rate',
      value: `${sellThroughRate}%`,
      trend: sellThroughRate > 30 ? 'up' : sellThroughRate > 15 ? 'stable' : 'down',
      description: 'Percentage of listings that resulted in sales',
      icon: 'trending_up'
    });

    // 4. Most popular material
    const materialCounts: Record<string, number> = {};
    listings.forEach(l => {
      const material = l.material.toLowerCase().split(' ')[0];
      materialCounts[material] = (materialCounts[material] || 0) + 1;
    });
    const topMaterial = Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0];
    if (topMaterial) {
      insights.push({
        title: 'Trending Material',
        value: topMaterial[0].charAt(0).toUpperCase() + topMaterial[0].slice(1),
        change: topMaterial[1],
        trend: 'up',
        description: `${topMaterial[1]} listings feature this material`,
        icon: 'local_fire_department'
      });
    }

    // 5. Best performing location
    const locationSales: Record<string, number> = {};
    soldListings.forEach(l => {
      const loc = l.location.split(',')[0].trim();
      locationSales[loc] = (locationSales[loc] || 0) + 1;
    });
    const topLocation = Object.entries(locationSales).sort((a, b) => b[1] - a[1])[0];
    if (topLocation) {
      insights.push({
        title: 'Top Market',
        value: topLocation[0],
        change: topLocation[1],
        trend: 'up',
        description: `${topLocation[1]} successful transactions`,
        icon: 'location_on'
      });
    }

    // 6. Seasonal opportunity
    const currentMonth = new Date().getMonth() + 1;
    const seasonalFactors = SEASONAL_FACTORS[currentMonth] || {};
    const hotMaterials = Object.entries(seasonalFactors)
      .filter(([_, factor]) => factor > 1.15)
      .map(([material]) => material);
    
    if (hotMaterials.length > 0) {
      insights.push({
        title: 'Seasonal Opportunity',
        value: hotMaterials.slice(0, 2).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', '),
        trend: 'up',
        description: 'High demand materials this season',
        icon: 'wb_sunny'
      });
    }

    return insights;
  },

  /**
   * Get material trend analysis
   */
  getMaterialTrends: (listings: Listing[]): MaterialTrend[] => {
    const currentMonth = new Date().getMonth() + 1;
    const materials = ['cotton', 'silk', 'wool', 'linen', 'denim', 'polyester', 'velvet'];
    
    return materials.map(material => {
      const seasonalFactor = SEASONAL_FACTORS[currentMonth]?.[material] || 1;
      const materialListings = listings.filter(l => l.material.toLowerCase().includes(material));
      const soldCount = materialListings.filter(l => l.status === 'Sold').length;
      const demandScore = Math.round((seasonalFactor * 50) + (soldCount * 5));
      const avgPrice = materialListings.length > 0 
        ? Math.round(materialListings.reduce((sum, l) => sum + l.pricePerUnit, 0) / materialListings.length)
        : MATERIAL_BASE_PRICES[material] || MATERIAL_BASE_PRICES['default'];
      
      let trend: MaterialTrend['trend'] = 'stable';
      if (seasonalFactor > 1.15) trend = 'rising';
      else if (seasonalFactor < 0.95) trend = 'falling';

      return {
        material: material.charAt(0).toUpperCase() + material.slice(1),
        demandScore: Math.min(100, demandScore),
        priceChangePercent: Math.round((seasonalFactor - 1) * 100),
        avgPrice,
        trend
      };
    }).sort((a, b) => b.demandScore - a.demandScore);
  },

  /**
   * Get aggregated market insights for the analytics dashboard
   */
  getAggregatedMarketInsights: (listings: Listing[]): AggregatedMarketInsights => {
    const availableListings = listings.filter(l => l.status === 'Available');
    const soldListings = listings.filter(l => l.status === 'Sold');
    
    // Calculate market health (0-100)
    const listingScore = Math.min(listings.length * 5, 40);
    const diversityScore = new Set(listings.map(l => l.material)).size * 5;
    const activityScore = soldListings.length * 3;
    const marketHealthScore = Math.min(100, listingScore + diversityScore + activityScore + 20);

    // Determine demand trend based on recent activity
    const recentListings = listings.filter(l => {
      const daysDiff = (Date.now() - new Date(l.dateListed).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 14;
    });
    let demandTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentListings.length > 3) demandTrend = 'increasing';
    else if (recentListings.length === 0 && listings.length > 5) demandTrend = 'decreasing';

    // Calculate simulated price change
    const currentMonth = new Date().getMonth() + 1;
    const avgSeasonalFactor = Object.values(SEASONAL_FACTORS[currentMonth] || {}).reduce((a, b) => a + b, 0) / 7;
    const priceChange = Math.round((avgSeasonalFactor - 1) * 100);

    // Find top material
    const materialCounts: Record<string, number> = {};
    listings.forEach(l => {
      const mat = l.material.toLowerCase().split(' ')[0];
      materialCounts[mat] = (materialCounts[mat] || 0) + 1;
    });
    const topMaterialEntry = Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0];
    const topMaterial = topMaterialEntry 
      ? topMaterialEntry[0].charAt(0).toUpperCase() + topMaterialEntry[0].slice(1)
      : 'Cotton';

    // Generate recommendations
    const recommendations: AggregatedMarketInsights['recommendations'] = [];
    
    if (availableListings.length < 5) {
      recommendations.push({
        type: 'action',
        message: 'Market needs more listings. Great time to sell your surplus fabric!'
      });
    }
    
    const hotMaterials = Object.entries(SEASONAL_FACTORS[currentMonth] || {})
      .filter(([_, factor]) => factor > 1.15)
      .map(([mat]) => mat.charAt(0).toUpperCase() + mat.slice(1));
    
    if (hotMaterials.length > 0) {
      recommendations.push({
        type: 'opportunity',
        message: `${hotMaterials.slice(0, 2).join(' & ')} are in high demand this season`
      });
    }

    if (soldListings.length > 0) {
      recommendations.push({
        type: 'info',
        message: `${soldListings.length} successful transactions completed on the platform`
      });
    }

    if (listings.length > 10 && diversityScore < 15) {
      recommendations.push({
        type: 'warning',
        message: 'Limited material variety. Consider diversifying fabric types'
      });
    }

    return {
      marketHealthScore,
      demandTrend,
      priceChange,
      topMaterial,
      recommendations
    };
  },

  /**
   * Smart alert suggestions for sellers
   */
  getSellerAlerts: (
    userListings: Listing[],
    allListings: Listing[]
  ): { type: 'warning' | 'opportunity' | 'tip'; message: string; action?: string }[] => {
    const alerts: { type: 'warning' | 'opportunity' | 'tip'; message: string; action?: string }[] = [];

    // Check for pricing issues
    userListings.forEach(listing => {
      if (listing.status !== 'Available') return;

      const similarListings = allListings.filter(l => 
        l.id !== listing.id &&
        l.status === 'Available' &&
        l.material.toLowerCase().includes(listing.material.toLowerCase().split(' ')[0])
      );

      if (similarListings.length > 0) {
        const avgPrice = similarListings.reduce((sum, l) => sum + l.pricePerUnit, 0) / similarListings.length;
        
        if (listing.pricePerUnit > avgPrice * 1.3) {
          alerts.push({
            type: 'warning',
            message: `"${listing.title}" is priced ${Math.round((listing.pricePerUnit / avgPrice - 1) * 100)}% above market average`,
            action: 'Consider adjusting price for better visibility'
          });
        }
      }

      // Check for seasonal opportunities
      const currentMonth = new Date().getMonth() + 1;
      const seasonalFactors = SEASONAL_FACTORS[currentMonth] || {};
      for (const [material, factor] of Object.entries(seasonalFactors)) {
        if (listing.material.toLowerCase().includes(material) && factor > 1.2) {
          alerts.push({
            type: 'opportunity',
            message: `High demand season for ${material}! Your "${listing.title}" could sell quickly`,
            action: 'Consider featuring this listing'
          });
          break;
        }
      }
    });

    // General tips
    if (userListings.length === 0) {
      alerts.push({
        type: 'tip',
        message: 'Start listing your surplus fabric to reach buyers across India',
        action: 'Create your first listing'
      });
    } else if (userListings.filter(l => l.status === 'Available').length > 5) {
      alerts.push({
        type: 'tip',
        message: 'You have multiple active listings. Consider bundling similar fabrics for bulk buyers',
        action: 'Review listings'
      });
    }

    return alerts;
  }
};
