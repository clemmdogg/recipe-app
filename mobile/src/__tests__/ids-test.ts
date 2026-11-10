import { IdNamespaces, nameBasedUuid } from '@/utils/ids';

// The DNS namespace from RFC 9562, used by the standard UUID v5 test vector.
const DnsNamespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('nameBasedUuid', () => {
  it('matches the standard UUID v5 test vector', async () => {
    await expect(nameBasedUuid(DnsNamespace, 'www.example.com')).resolves.toBe(
      '2ed6657d-e927-568b-95e1-2665a8aea6a2'
    );
  });

  it('gives the same id for the same name', async () => {
    const first = await nameBasedUuid(IdNamespaces.pantryItem, 'garlic');
    const second = await nameBasedUuid(IdNamespaces.pantryItem, 'garlic');

    expect(first).toBe(second);
  });

  it('gives different ids for different names and namespaces', async () => {
    const garlic = await nameBasedUuid(IdNamespaces.pantryItem, 'garlic');

    await expect(nameBasedUuid(IdNamespaces.pantryItem, 'onion')).resolves.not.toBe(garlic);
    await expect(nameBasedUuid(DnsNamespace, 'garlic')).resolves.not.toBe(garlic);
  });

  it('handles non-ASCII names', async () => {
    await expect(nameBasedUuid(IdNamespaces.pantryItem, 'crème fraîche')).resolves.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('rejects an invalid namespace', async () => {
    await expect(nameBasedUuid('not-a-uuid', 'garlic')).rejects.toThrow(/Invalid UUID/);
  });
});
