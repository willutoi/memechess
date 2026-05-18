import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { username, pack_name, price, type } = await req.json();

    if (!username || !pack_name) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if they own it
    const ownedItems = user.owned_items.split(',');
    const alreadyOwned = ownedItems.includes(pack_name);

    if (!alreadyOwned && user.meme_coins < price && price > 0) {
      return NextResponse.json({ error: 'Not enough MemeCoins' }, { status: 400 });
    }

    const newCoins = alreadyOwned ? user.meme_coins : user.meme_coins - price;
    const newOwnedItems = alreadyOwned ? user.owned_items : `${user.owned_items},${pack_name}`;

    const updatedUser = await prisma.user.update({
      where: { username },
      data: {
        meme_coins: newCoins,
        owned_items: newOwnedItems,
        ...(type === 'skin' ? { active_skin_pack: pack_name } : {}),
        ...(type === 'audio' ? { active_audio_pack: pack_name } : {})
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Shop Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
