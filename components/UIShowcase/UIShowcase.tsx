import React, { useState } from 'react';
import { Button, Input, Skeleton, SkeletonCard, SkeletonList, SkeletonTable } from '../ui';
import { MailIcon, LockIcon } from "../Icons/Icons";

/**
 * Component showcase for testing the new UI components
 * Visit this page to verify all components render correctly
 */
const UIShowcase: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [floatingInputValue, setFloatingInputValue] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">UI Component Showcase</h1>
          <p className="text-gray-600">Test all modernized components</p>
        </div>

        {/* Buttons Section */}
        <section className="bg-white p-8 rounded-xl shadow-medium">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Buttons</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="destructive">Destructive Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="outline">Outline Button</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">States</h3>
              <div className="flex flex-wrap gap-3">
                <Button isLoading={isLoading} onClick={() => setIsLoading(!isLoading)}>
                  {isLoading ? 'Loading...' : 'Toggle Loading'}
                </Button>
                <Button disabled>Disabled Button</Button>
                <Button variant="primary" fullWidth>Full Width Button</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Button leftIcon={<MailIcon className="h-5 w-5" />}>With Left Icon</Button>
                <Button 
                  variant="secondary" 
                  rightIcon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  }
                >
                  With Right Icon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="bg-white p-8 rounded-xl shadow-medium">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Inputs</h2>
          
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Default Variant</h3>
              <div className="space-y-4">
                <Input 
                  label="Email Address" 
                  type="email" 
                  placeholder="you@example.com"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Input 
                  label="Password" 
                  type="password" 
                  helperText="Must be at least 8 characters"
                />
                <Input 
                  label="Error State" 
                  type="text" 
                  error="This field is required"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">With Icons</h3>
              <div className="space-y-4">
                <Input 
                  label="Email" 
                  type="email" 
                  leftIcon={<MailIcon className="h-5 w-5" />}
                  placeholder="you@example.com"
                />
                <Input 
                  label="Password" 
                  type="password" 
                  leftIcon={<LockIcon className="h-5 w-5" />}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Floating Labels</h3>
              <div className="space-y-4">
                <Input 
                  variant="floating"
                  label="Email Address" 
                  type="email"
                  value={floatingInputValue}
                  onChange={(e) => setFloatingInputValue(e.target.value)}
                />
                <Input 
                  variant="floating"
                  label="Email with Icon" 
                  type="email"
                  leftIcon={<MailIcon className="h-5 w-5" />}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Skeletons Section */}
        <section className="bg-white p-8 rounded-xl shadow-medium">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Skeleton Loaders</h2>
          
          <div className="flex items-center gap-3 mb-6">
            <Button 
              variant={showSkeleton ? "destructive" : "primary"}
              onClick={() => setShowSkeleton(!showSkeleton)}
            >
              {showSkeleton ? 'Hide' : 'Show'} Skeletons
            </Button>
          </div>

          {showSkeleton && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Basic Skeletons</h3>
                <div className="space-y-3">
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="text" width="60%" height={20} />
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circular" width={48} height={48} />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" width="40%" height={16} />
                      <Skeleton variant="text" width="60%" height={14} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Card Skeleton</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">List Skeleton</h3>
                <SkeletonList count={5} />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Table Skeleton</h3>
                <SkeletonTable rows={5} cols={4} />
              </div>
            </div>
          )}
        </section>

        {/* Micro-interactions Demo */}
        <section className="bg-white p-8 rounded-xl shadow-medium">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Micro-interactions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Hover & Active States</h3>
              <p className="text-gray-600 mb-3">Hover over these elements to see smooth transitions</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card hover:scale-105 transition-transform cursor-pointer">
                  <h4 className="font-semibold text-gray-800">Hover me!</h4>
                  <p className="text-sm text-gray-600 mt-2">I scale on hover</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-soft hover:shadow-large transition-shadow cursor-pointer">
                  <h4 className="font-semibold text-gray-800">Shadow effect</h4>
                  <p className="text-sm text-gray-600 mt-2">My shadow grows</p>
                </div>
                <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-6 rounded-xl text-white cursor-pointer hover:opacity-90 transition-opacity">
                  <h4 className="font-semibold">Gradient card</h4>
                  <p className="text-sm mt-2 text-white/90">Opacity changes</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Animations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="animate-fade-in bg-primary-light p-4 rounded-lg">
                  <p className="text-primary-dark font-medium">Fade In Animation</p>
                </div>
                <div className="animate-slide-in-right bg-secondary-light p-4 rounded-lg">
                  <p className="text-secondary font-medium">Slide In Right Animation</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="bg-white p-8 rounded-xl shadow-medium">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Color Palette</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Primary</h3>
              <div className="space-y-2">
                <div className="bg-primary-600 h-12 rounded flex items-center justify-center text-white text-sm">600</div>
                <div className="bg-primary-500 h-8 rounded flex items-center justify-center text-white text-xs">500</div>
                <div className="bg-primary-100 h-8 rounded flex items-center justify-center text-primary-900 text-xs">100</div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Secondary</h3>
              <div className="space-y-2">
                <div className="bg-secondary h-12 rounded flex items-center justify-center text-white text-sm">Default</div>
                <div className="bg-secondary-hover h-8 rounded flex items-center justify-center text-white text-xs">Hover</div>
                <div className="bg-secondary-light h-8 rounded flex items-center justify-center text-secondary text-xs">Light</div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Success</h3>
              <div className="space-y-2">
                <div className="bg-success h-12 rounded flex items-center justify-center text-white text-sm">Default</div>
                <div className="bg-success-hover h-8 rounded flex items-center justify-center text-white text-xs">Hover</div>
                <div className="bg-success-light h-8 rounded flex items-center justify-center text-success text-xs">Light</div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Error</h3>
              <div className="space-y-2">
                <div className="bg-error h-12 rounded flex items-center justify-center text-white text-sm">Default</div>
                <div className="bg-error-hover h-8 rounded flex items-center justify-center text-white text-xs">Hover</div>
                <div className="bg-error-light h-8 rounded flex items-center justify-center text-error text-xs">Light</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default UIShowcase;
