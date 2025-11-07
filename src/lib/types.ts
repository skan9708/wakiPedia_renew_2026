export type WineType = 'Red' | 'White' | 'Rose' | 'Sparkling';

export type Wine = {
  id: string;
  nameKr: string;
  nameEng: string;
  imageUrl?: string;
  wineType: WineType;
  regions?: string;
  breed?: string;
  ratingAverage?: number;
};

export type Review = {
  id: string;
  wineId: string;
  creator: { id: string; nickname: string; avatarUrl?: string };
  rating: number;
  bodyRating?: number; sweetRating?: number; taninRating?: number; acidityRating?: number;
  text: string;
  likeCount: number;
  createdAt: string;
  feels?: string[];
};








