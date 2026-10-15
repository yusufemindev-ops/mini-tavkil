import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { COUNTRIES, countryName, getCountry } from '@repo/countries';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectMenu } from '@/components/ui/select-menu';
import { PhoneInput } from '@/components/ui/phone-input';
import { Field, FieldError, FieldHelp, FieldLabel, FormRow } from '@/components/ui/field';
import { ApiError } from '@/lib/api/client';
import { buyersKeys, createBuyer } from './queries';

const countryOptions = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${countryName(c, 'en')}`,
}));

function buildPhone(dial: string, raw: string): string {
  const n = raw.trim();
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) return `+${n.slice(2).trim()}`;
  return `${dial} ${n}`.trim();
}

type Errors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'phoneNumber' | 'country' | 'tierMarkup', string>
>;

export function BuyerNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('TR');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [tierMarkup, setTierMarkup] = useState('0');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const markupPct = Number(tierMarkup) || 0;

  const create = useMutation({
    mutationFn: () => {
      const dial = getCountry(phoneCountry)?.dial ?? '';
      return createBuyer({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: buildPhone(dial, phoneNumber),
        country,
        companyName: company.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        tierMarkup: markupPct,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (buyer) => {
      void queryClient.invalidateQueries({ queryKey: buyersKeys.all });
      toast.success('Buyer account created', {
        description: `${buyer.email} can now sign in with Google.`,
      });
      navigate('/buyer-accounts');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not create the buyer account.'),
  });

  const submit = () => {
    const next: Errors = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email.';
    if (!phoneNumber.trim()) next.phoneNumber = 'Phone number is required.';
    if (!country) next.country = 'Select a country.';
    if (markupPct < 0 || markupPct > 100)
      next.tierMarkup = 'Tier markup must be between 0 and 100.';
    setErrors(next);
    if (Object.keys(next).length === 0) create.mutate();
  };

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="text-muted-foreground mb-3 flex items-center gap-1.5 text-sm">
        <Link to="/buyer-accounts" className="hover:text-foreground">
          Buyer accounts
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">New buyer</span>
      </div>

      <PageHeader
        title="New buyer"
        subtitle="Provision a buyer account. They can sign in immediately with Google using this email."
      />

      <Panel>
        <PanelHead title="Contact" />
        <PanelBody>
          <FormRow>
            <Field>
              <FieldLabel required>First name</FieldLabel>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
            </Field>
            <Field>
              <FieldLabel required>Last name</FieldLabel>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
              {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
            </Field>
          </FormRow>
          <Field>
            <FieldLabel required>Email</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@company.com"
            />
            {errors.email ? (
              <FieldError>{errors.email}</FieldError>
            ) : (
              <FieldHelp>Google sign-in email for this buyer.</FieldHelp>
            )}
          </Field>
          <Field className="mb-0">
            <FieldLabel required>Phone</FieldLabel>
            <PhoneInput
              countryCode={phoneCountry}
              number={phoneNumber}
              onCountryChange={setPhoneCountry}
              onNumberChange={setPhoneNumber}
              invalid={!!errors.phoneNumber}
            />
            {errors.phoneNumber && <FieldError>{errors.phoneNumber}</FieldError>}
          </Field>
        </PanelBody>
      </Panel>

      <Panel className="mt-[18px]">
        <PanelHead title="Company" />
        <PanelBody>
          <FormRow className="mb-0">
            <Field className="mb-0">
              <FieldLabel>Company</FieldLabel>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              <FieldHelp>Optional.</FieldHelp>
            </Field>
            <Field className="mb-0">
              <FieldLabel>Job title</FieldLabel>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </Field>
          </FormRow>
        </PanelBody>
      </Panel>

      <Panel className="mt-[18px]">
        <PanelHead title="Location" />
        <PanelBody>
          <FormRow>
            <Field>
              <FieldLabel required>Country</FieldLabel>
              <SelectMenu
                value={country}
                onValueChange={setCountry}
                options={countryOptions}
                placeholder="Select a country…"
              />
              {errors.country && <FieldError>{errors.country}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>City</FieldLabel>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </FormRow>
          <Field className="mb-0">
            <FieldLabel>Address</FieldLabel>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </PanelBody>
      </Panel>

      <Panel className="border-primary/30 mt-[18px]">
        <PanelHead title="Pricing tier" />
        <PanelBody>
          <Field>
            <FieldLabel required>Tier markup %</FieldLabel>
            <Input
              type="number"
              min={0}
              max={100}
              value={tierMarkup}
              onChange={(e) => setTierMarkup(e.target.value)}
            />
            {errors.tierMarkup ? (
              <FieldError>{errors.tierMarkup}</FieldError>
            ) : (
              <FieldHelp>Applied to base prices for every product this buyer sees.</FieldHelp>
            )}
          </Field>
          <div className="bg-muted/50 rounded-md px-3 py-2.5 text-[12.5px]">
            <strong>Example:</strong> a base price of $10 displays as{' '}
            <strong>${(10 * (1 + markupPct / 100)).toFixed(2)}</strong> for this buyer.
          </div>
        </PanelBody>
      </Panel>

      <Panel className="mt-[18px]">
        <PanelHead title="Internal note" />
        <PanelBody>
          <Field className="mb-0">
            <FieldLabel>Note</FieldLabel>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Visible to admins only."
            />
          </Field>
        </PanelBody>
      </Panel>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/buyer-accounts')}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={create.isPending}>
          <UserPlus className="size-4" />
          Create buyer
        </Button>
      </div>
    </div>
  );
}
